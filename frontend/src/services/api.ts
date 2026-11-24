import { API_URL } from "@/utils/constants";
import type { AdminStats, Category, Conversation, Message, Preferences, User } from "@/utils/types";

const TOKEN_KEY = "nova.token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];
  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal; raw?: boolean };

async function request<T>(path: string, { method = "GET", body, signal, raw }: Options = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Can't reach the server. Check your connection and that the API is running.");
  }
  if (res.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event("nova:logout"));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details);
  }
  if (res.status === 204) return undefined as T;
  return (raw ? res.text() : res.json()) as Promise<T>;
}

export const api = {
  // auth
  signup: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/signup", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", { method: "POST", body }),
  me: () => request<{ user: User }>("/auth/me"),
  updateProfile: (body: { name?: string; preferences?: Partial<Preferences> }) =>
    request<{ user: User }>("/auth/me", { method: "PATCH", body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>("/auth/me/password", { method: "POST", body }),

  // conversations
  conversations: (search = "", signal?: AbortSignal) =>
    request<{ conversations: Conversation[] }>(`/conversations${search ? `?search=${encodeURIComponent(search)}` : ""}`, { signal }),
  conversation: (id: string) => request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  createConversation: (body: { category?: Category; title?: string }) =>
    request<{ conversation: Conversation }>("/conversations", { method: "POST", body }),
  updateConversation: (id: string, body: Partial<Pick<Conversation, "title" | "category" | "pinned">>) =>
    request<{ conversation: Conversation }>(`/conversations/${id}`, { method: "PATCH", body }),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: "DELETE" }),
  deleteAllConversations: () => request<void>("/conversations", { method: "DELETE" }),
  exportConversation: (id: string) => request<string>(`/conversations/${id}/export`, { raw: true }),
  sendMessageRest: (id: string, content: string) =>
    request<{ conversation: Conversation; message: Message }>(`/conversations/${id}/messages`, { method: "POST", body: { content } }),
  rate: (conversationId: string, messageId: string, rating: -1 | 0 | 1, feedback?: string) =>
    request<{ message: Message }>(`/conversations/${conversationId}/messages/${messageId}/rating`, {
      method: "PATCH",
      body: { rating, ...(feedback !== undefined ? { feedback } : {}) },
    }),

  // admin
  stats: (days = 14) => request<AdminStats>(`/admin/stats?days=${days}`),
  users: (search = "") => request<{ users: User[] }>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  setRole: (id: string, role: "user" | "admin") => request<{ user: User }>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),

  health: () => request<{ status: string; provider: string; model: string; storage: string }>("/health"),
};
