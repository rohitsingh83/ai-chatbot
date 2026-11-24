"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { api } from "@/services/api";
import { API_URL } from "@/utils/constants";
import type { Attachment, Category, Conversation, Message, ToolStep } from "@/utils/types";
import { useAuth } from "./auth-context";

export type StreamState = { text: string; phase: "thinking" | "streaming"; tools?: ToolStep[] };
export type ConnectionState = "connecting" | "online" | "offline";

type ChatState = {
  connection: ConnectionState;
  conversations: Conversation[];
  conversationsLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
  messages: Record<string, Message[]>;
  streams: Record<string, StreamState>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (category: Category) => Promise<Conversation>;
  send: (conversationId: string, content: string, attachments?: Attachment[]) => Promise<void>;
  regenerate: (conversationId: string) => Promise<void>;
  stop: (conversationId: string) => void;
  rate: (conversationId: string, messageId: string, rating: -1 | 0 | 1, feedback?: string) => Promise<void>;
  updateConversation: (id: string, patch: Partial<Pick<Conversation, "title" | "category" | "pinned">>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const ChatContext = createContext<ChatState | null>(null);

const sortConvs = (list: Conversation[]) =>
  [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAt.localeCompare(a.lastMessageAt));

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  const loaded = useRef(new Set<string>());

  const upsertConversation = useCallback((c: Conversation) => {
    setConversations((list) => sortConvs([c, ...list.filter((x) => x.id !== c.id)]));
  }, []);

  const appendMessage = useCallback((m: Message, clientId?: string) => {
    setMessages((all) => {
      const list = (all[m.conversation] || []).filter((x) => x.id !== m.id && (!clientId || x.clientId !== clientId));
      return { ...all, [m.conversation]: [...list, m] };
    });
  }, []);

  const endStream = useCallback((id: string) => {
    setStreams((s) => {
      const rest = { ...s };
      delete rest[id];
      return rest;
    });
  }, []);

  // ---- Socket.io wiring ----
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnection("online"));
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));

    socket.on("chat:conversation", ({ conversation }: { conversation: Conversation }) => upsertConversation(conversation));
    socket.on("chat:user-message", ({ message, clientId }: { message: Message; clientId?: string }) => appendMessage(message, clientId));
    socket.on("chat:start", ({ conversationId }: { conversationId: string }) =>
      setStreams((s) => ({ ...s, [conversationId]: { text: "", phase: "thinking" } }))
    );
    socket.on("chat:token", ({ conversationId, token: t }: { conversationId: string; token: string }) =>
      setStreams((s) => ({ ...s, [conversationId]: { ...s[conversationId], text: (s[conversationId]?.text || "") + t, phase: "streaming" } }))
    );
    socket.on("chat:tool", ({ conversationId, step }: { conversationId: string; step: ToolStep }) =>
      setStreams((s) => {
        const cur = s[conversationId] || { text: "", phase: "thinking" as const };
        const tools = [...(cur.tools || []).filter((x) => x.id !== step.id), step];
        return { ...s, [conversationId]: { ...cur, tools } };
      })
    );
    socket.on("chat:done", ({ conversationId, message }: { conversationId: string; message: Message }) => {
      appendMessage(message);
      endStream(conversationId);
    });
    socket.on("chat:error", ({ conversationId, error, message }: { conversationId: string; error: string; message?: Message }) => {
      if (message) appendMessage(message);
      if (conversationId) endStream(conversationId);
      toast.error(error);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, upsertConversation, appendMessage, endStream]);

  // ---- Conversation list (server-side search, debounced) ----
  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setConversationsLoading(true);
      api
        .conversations(search, ctrl.signal)
        .then(({ conversations }) => setConversations(conversations))
        .catch((e) => e.name !== "AbortError" && toast.error(e.message))
        .finally(() => setConversationsLoading(false));
    }, search ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [token, search]);

  const loadConversation = useCallback(async (id: string) => {
    if (loaded.current.has(id)) return;
    const { conversation, messages: list } = await api.conversation(id);
    loaded.current.add(id);
    setMessages((all) => {
      // Keep anything that arrived over the socket while we were fetching.
      const extra = (all[id] || []).filter((m) => !list.some((x) => x.id === m.id));
      return { ...all, [id]: [...list, ...extra] };
    });
    upsertConversation(conversation);
  }, [upsertConversation]);

  const createConversation = useCallback(async (category: Category) => {
    const { conversation } = await api.createConversation({ category });
    loaded.current.add(conversation.id);
    setMessages((all) => ({ ...all, [conversation.id]: [] }));
    upsertConversation(conversation);
    return conversation;
  }, [upsertConversation]);

  const send = useCallback(async (conversationId: string, content: string, attachments: Attachment[] = []) => {
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: Message = {
      id: clientId,
      clientId,
      pending: true,
      conversation: conversationId,
      role: "user",
      content,
      ...(attachments.length ? { attachments } : {}),
      rating: 0,
      feedback: "",
      createdAt: new Date().toISOString(),
    };
    setMessages((all) => ({ ...all, [conversationId]: [...(all[conversationId] || []), optimistic] }));

    const socket = socketRef.current;
    if (socket?.connected) {
      const ack = await socket.timeout(15000).emitWithAck("chat:send", { conversationId, content, attachments, clientId }).catch(() => ({
        ok: false,
        error: "The server didn't respond in time.",
      }));
      if (!ack.ok) {
        setMessages((all) => ({ ...all, [conversationId]: (all[conversationId] || []).filter((m) => m.clientId !== clientId) }));
        throw new Error(ack.error);
      }
      return;
    }

    // Fallback when WebSockets are unavailable: plain HTTP request/response.
    setStreams((s) => ({ ...s, [conversationId]: { text: "", phase: "thinking" } }));
    try {
      const r = await api.sendMessageRest(conversationId, content, attachments);
      loaded.current.delete(conversationId);
      await loadConversation(conversationId);
      upsertConversation(r.conversation);
    } catch (e) {
      setMessages((all) => ({ ...all, [conversationId]: (all[conversationId] || []).filter((m) => m.clientId !== clientId) }));
      throw e;
    } finally {
      endStream(conversationId);
    }
  }, [loadConversation, upsertConversation, endStream]);

  const regenerate = useCallback(async (conversationId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error("Reconnecting… try again in a moment.");
    const prev = messages[conversationId] || [];
    const last = prev[prev.length - 1];
    if (last?.role === "assistant") {
      setMessages((all) => ({ ...all, [conversationId]: prev.slice(0, -1) }));
    }
    const ack = await socket.emitWithAck("chat:regenerate", { conversationId });
    if (!ack.ok) {
      setMessages((all) => ({ ...all, [conversationId]: prev }));
      throw new Error(ack.error);
    }
  }, [messages]);

  const stop = useCallback((conversationId: string) => {
    socketRef.current?.emit("chat:stop", { conversationId });
  }, []);

  const rate = useCallback(async (conversationId: string, messageId: string, rating: -1 | 0 | 1, feedback?: string) => {
    const patch = (r: -1 | 0 | 1, f?: string) =>
      setMessages((all) => ({
        ...all,
        [conversationId]: (all[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, rating: r, ...(f !== undefined ? { feedback: f } : {}) } : m
        ),
      }));
    const before = messages[conversationId]?.find((m) => m.id === messageId);
    patch(rating, feedback);
    try {
      await api.rate(conversationId, messageId, rating, feedback);
    } catch (e) {
      if (before) patch(before.rating, before.feedback);
      throw e;
    }
  }, [messages]);

  const updateConversation = useCallback(async (id: string, p: Partial<Pick<Conversation, "title" | "category" | "pinned">>) => {
    const { conversation } = await api.updateConversation(id, p);
    upsertConversation(conversation);
  }, [upsertConversation]);

  const deleteConversation = useCallback(async (id: string) => {
    await api.deleteConversation(id);
    loaded.current.delete(id);
    setConversations((l) => l.filter((c) => c.id !== id));
    setMessages((all) => {
      const rest = { ...all };
      delete rest[id];
      return rest;
    });
  }, []);

  const clearAll = useCallback(async () => {
    await api.deleteAllConversations();
    loaded.current.clear();
    setConversations([]);
    setMessages({});
  }, []);

  const value = useMemo<ChatState>(
    () => ({
      connection,
      conversations,
      conversationsLoading,
      search,
      setSearch,
      messages,
      streams,
      loadConversation,
      createConversation,
      send,
      regenerate,
      stop,
      rate,
      updateConversation,
      deleteConversation,
      clearAll,
    }),
    [connection, conversations, conversationsLoading, search, messages, streams, loadConversation, createConversation, send, regenerate, stop, rate, updateConversation, deleteConversation, clearAll]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
