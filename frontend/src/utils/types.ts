export type Category = "casual" | "professional" | "creative" | "coding";
export type Theme = "light" | "dark" | "system";
export type Accent = "violet" | "blue" | "emerald" | "rose" | "amber";

export interface Preferences {
  botName: string;
  theme: Theme;
  accent: Accent;
  defaultCategory: Category;
  language: string;
  responseLength: "concise" | "balanced" | "detailed";
  sendOnEnter: boolean;
  customInstructions: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  preferences: Preferences;
  createdAt: string;
  lastActiveAt: string;
  messageCount?: number;
}

export interface Conversation {
  id: string;
  title: string;
  category: Category;
  pinned: boolean;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  text: string;
}

export interface ToolStep {
  id?: string;
  name: string;
  label: string;
  status: "running" | "done" | "error";
  error?: string;
}

export interface Message {
  id: string;
  conversation: string;
  role: "user" | "assistant";
  content: string;
  rating: -1 | 0 | 1;
  feedback: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  cached?: boolean;
  error?: boolean;
  /** Files the user attached; their text is what the AI reads. */
  attachments?: Attachment[];
  /** Tools the assistant used for this reply (web search, weather…). */
  tools?: ToolStep[];
  createdAt: string;
  /** Set on optimistic messages until the server confirms them. */
  clientId?: string;
  pending?: boolean;
}

export interface AdminStats {
  totals: {
    users: number;
    conversations: number;
    messages: number;
    activeUsers7d: number;
    avgLatencyMs: number;
    satisfaction: number | null;
    cacheHits: number;
    errors: number;
  };
  ratings: { up: number; down: number; unrated: number };
  daily: { date: string; messages: number; activeUsers: number; conversations: number }[];
  hourly: { hour: number; messages: number }[];
  categories: { category: Category; count: number }[];
  topUsers: { id: string; name: string; email: string; messages: number }[];
  recentActivity: { id: string; title: string; category: Category; messageCount: number; lastMessageAt: string; userName: string }[];
  recentFeedback: { id: string; rating: number; feedback: string; excerpt: string; userName: string; updatedAt: string }[];
  system: {
    provider: string;
    model: string;
    storage: string;
    onlineUsers: number;
    cache: { hits: number; misses: number };
    uptimeSec: number;
  };
}
