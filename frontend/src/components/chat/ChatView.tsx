"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Download, Menu, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { useShell } from "@/components/shell/shell-context";
import { api } from "@/services/api";
import { Composer, type ComposerHandle } from "./Composer";
import { MessageBubble, StreamingBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { ModePicker } from "./ModePicker";
import { cn } from "@/utils/cn";
import type { Attachment, Category } from "@/utils/types";

export function ChatView({ id }: { id?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const chat = useChat();
  const { setOpen } = useShell();
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [stick, setStick] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draftCategory, setDraftCategory] = useState<Category>(user!.preferences.defaultCategory);

  const prefs = user!.preferences;
  const conversation = id ? chat.conversations.find((c) => c.id === id) : undefined;
  const messages = id ? chat.messages[id] : [];
  const stream = id ? chat.streams[id] : undefined;
  const category = conversation?.category || draftCategory;
  const firstName = user!.name.split(" ")[0];

  useEffect(() => {
    if (!id) return;
    chat.loadConversation(id).catch((e) => {
      setLoadError(true);
      toast.error(e.message);
      if (e.status === 404 || e.status === 403) router.replace("/chat");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => composer.current?.focus(), [id]);

  // Keep the newest message in view while the user is at the bottom.
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => {
    if (stick) scrollToBottom(false);
  }, [messages?.length, stream?.text, stream?.tools?.length, stick, scrollToBottom]);

  const onScroll = () => {
    const el = scroller.current!;
    setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const send = async (text: string, attachments: Attachment[] = []) => {
    setStick(true);
    if (id) return chat.send(id, text, attachments);
    const conv = await chat.createConversation(draftCategory);
    router.push(`/chat/${conv.id}`);
    await chat.send(conv.id, text, attachments);
  };

  const changeMode = (c: Category) => {
    if (!id) return setDraftCategory(c);
    chat.updateConversation(id, { category: c }).then(
      () => toast.success(`Switched to ${c} mode`),
      (e) => toast.error(e.message)
    );
  };

  const exportMd = async () => {
    if (!id) return;
    try {
      const md = await api.exportConversation(id);
      const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
      Object.assign(document.createElement("a"), { href: url, download: `${(conversation?.title || "chat").replace(/[^\w\- ]+/g, "")}.md` }).click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const busy = !!stream;
  const lastAssistant = messages?.length && messages[messages.length - 1].role === "assistant" ? messages[messages.length - 1].id : null;

  return (
    <div className="relative flex h-full flex-col">
      {/* soft ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,rgb(var(--accent)/0.12),transparent_70%)]" />

      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-hover lg:hidden" aria-label="Open sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">{id ? conversation?.title || "Loading…" : "New chat"}</h1>
        </div>
        <ModePicker value={category} onChange={changeMode} up={false} />
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex",
            chat.connection === "online" ? "bg-emerald-500/10 text-emerald-500" : chat.connection === "connecting" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
          )}
          title={chat.connection === "online" ? "Real-time connection active" : "Using HTTP fallback until the connection returns"}
        >
          {chat.connection === "offline" ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
          {chat.connection === "online" ? "Live" : chat.connection === "connecting" ? "Connecting" : "Offline"}
        </span>
        {id && (
          <button onClick={exportMd} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg" aria-label="Export conversation" title="Export as Markdown">
            <Download className="h-4 w-4" />
          </button>
        )}
      </header>

      <div ref={scroller} onScroll={onScroll} className="flex flex-1 flex-col overflow-y-auto">
        {!id || (messages && messages.length === 0 && !stream) ? (
          <EmptyState name={firstName} botName={prefs.botName} category={category} onPick={(p) => send(p).catch((e) => toast.error(e.message))} />
        ) : !messages ? (
          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
            {loadError ? (
              <p className="text-center text-sm text-muted">Couldn&apos;t load this conversation.</p>
            ) : (
              [0, 1, 2].map((i) => (
                <div key={i} className={cn("flex gap-3", i % 2 === 0 && "justify-end")}>
                  <div className={cn("h-14 animate-pulse rounded-3xl bg-hover", i % 2 === 0 ? "w-1/2" : "w-3/4")} />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-8 sm:px-6">
            {messages.map((m) => (
              <MessageBubble
                key={m.clientId || m.id}
                message={m}
                botName={prefs.botName}
                userName={user!.name}
                isLast={m.id === lastAssistant && !busy}
                onRate={(r, f) => chat.rate(id!, m.id, r, f)}
                onRegenerate={m.id === lastAssistant && !busy ? () => chat.regenerate(id!).catch((e) => toast.error(e.message)) : undefined}
              />
            ))}
            {stream && <StreamingBubble text={stream.text} phase={stream.phase} tools={stream.tools} botName={prefs.botName} />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {!stick && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setStick(true);
              scrollToBottom();
            }}
            className="glass absolute bottom-36 left-1/2 z-10 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full shadow-lg"
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 sm:px-6 sm:pb-5">
        <Composer
          ref={composer}
          onSend={send}
          onStop={() => id && chat.stop(id)}
          busy={busy}
          sendOnEnter={prefs.sendOnEnter}
          botName={prefs.botName}
        />
      </div>
    </div>
  );
}
