"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  Check,
  Download,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { useShell } from "./shell-context";
import { Logo } from "@/components/ui/Logo";
import { ConfirmModal } from "@/components/ui/Modal";
import { api } from "@/services/api";
import { CATEGORIES } from "@/utils/constants";
import { groupLabel, initials } from "@/utils/format";
import { cn } from "@/utils/cn";
import { isDark } from "@/lib/theme";
import type { Conversation } from "@/utils/types";

const ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

export function Sidebar() {
  const { user, logout, updateUser } = useAuth();
  const { conversations, conversationsLoading, search, setSearch, streams } = useChat();
  const { open, setOpen } = useShell();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const theme = user?.preferences.theme;
  const dark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [pathname, setOpen]);

  const groups = useMemo(() => {
    const g: Record<string, Conversation[]> = {};
    for (const c of conversations) {
      const key = c.pinned ? "Pinned" : groupLabel(c.lastMessageAt);
      (g[key] ||= []).push(c);
    }
    return ORDER.filter((k) => g[k]?.length).map((k) => [k, g[k]] as const);
  }, [conversations]);

  const toggleTheme = () => {
    const next = isDark() ? "light" : "dark";
    updateUser({ preferences: { theme: next } }).catch((e) => toast.error(e.message));
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Logo href="/" />
        <button className="rounded-lg p-1.5 text-muted hover:bg-hover lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2 px-3">
        <Link
          href="/chat"
          className="group flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-gradient text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgb(var(--accent)/0.6)] transition hover:brightness-110"
        >
          <Plus className="h-4 w-4 transition group-hover:rotate-90" /> New chat
          <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-[10px] font-medium sm:inline">Ctrl ⇧ O</kbd>
        </Link>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-xl border border-line bg-elev/60 pl-9 pr-8 text-sm outline-none placeholder:text-subtle focus:border-accent"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-fg" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-3" aria-label="Conversations">
        {conversationsLoading && !conversations.length ? (
          <div className="space-y-2 px-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-hover" style={{ opacity: 1 - i * 0.13 }} />
            ))}
          </div>
        ) : !conversations.length ? (
          <div className="px-4 py-10 text-center text-sm text-subtle">{search ? "No chats match your search." : "No conversations yet. Say hi! 👋"}</div>
        ) : (
          groups.map(([label, list]) => (
            <div key={label} className="mb-3">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
              <AnimatePresence initial={false}>
                {list.map((c) => (
                  <ConversationItem key={c.id} c={c} active={params?.id === c.id} live={!!streams[c.id]} />
                ))}
              </AnimatePresence>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-line p-2">
        {user?.role === "admin" && (
          <NavLink href="/admin" active={pathname === "/admin"} icon={<BarChart3 className="h-4 w-4" />}>
            Admin dashboard
          </NavLink>
        )}
        <NavLink href="/settings" active={pathname === "/settings"} icon={<Settings className="h-4 w-4" />}>
          Settings
        </NavLink>
        <div className="mt-1 flex items-center gap-2 rounded-xl p-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-semibold text-white">{initials(user?.name)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-subtle">{user?.email}</div>
          </div>
          <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg" aria-label="Toggle theme" title="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={logout} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-red-500" aria-label="Log out" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-line bg-elev/50 backdrop-blur-xl lg:block">{content}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[85%] max-w-xs border-r border-line bg-panel-solid shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {content}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition", active ? "bg-hover text-fg" : "text-muted hover:bg-hover hover:text-fg")}>
      {icon}
      {children}
    </Link>
  );
}

function ConversationItem({ c, active, live }: { c: Conversation; active: boolean; live: boolean }) {
  const { updateConversation, deleteConversation } = useChat();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const emoji = CATEGORIES.find((x) => x.id === c.category)?.emoji;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const saveTitle = async () => {
    setEditing(false);
    const t = title.trim();
    if (!t || t === c.title) return setTitle(c.title);
    try {
      await updateConversation(c.id, { title: t });
    } catch (e) {
      toast.error((e as Error).message);
      setTitle(c.title);
    }
  };

  const exportMd = async () => {
    setMenu(false);
    try {
      const md = await api.exportConversation(c.id);
      const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${c.title.replace(/[^\w\- ]+/g, "").trim() || "chat"}.md` });
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Conversation exported");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group relative">
      {editing ? (
        <div className="flex items-center gap-1 rounded-xl bg-hover px-2 py-1">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(c.title);
                setEditing(false);
              }
            }}
            className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Conversation title"
          />
          <button onMouseDown={saveTitle} className="p-1 text-accent" aria-label="Save title">
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Link
          href={`/chat/${c.id}`}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 pr-9 text-sm transition",
            active ? "bg-[rgb(var(--accent)/0.12)] text-fg ring-1 ring-[rgb(var(--accent)/0.25)]" : "text-muted hover:bg-hover hover:text-fg"
          )}
        >
          <span className="text-xs opacity-80">{emoji}</span>
          <span className="truncate">{c.title}</span>
          {live && <span className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />}
        </Link>
      )}
      {!editing && (
        <button
          onClick={() => setMenu((m) => !m)}
          className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition hover:bg-hover hover:text-fg", menu ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100")}
          aria-label="Conversation options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      <AnimatePresence>
        {menu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-1 top-9 z-30 w-44 overflow-hidden rounded-xl border border-line bg-panel-solid p-1 shadow-2xl"
          >
            <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setMenu(false); setEditing(true); }}>Rename</MenuItem>
            <MenuItem icon={c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} onClick={() => { setMenu(false); updateConversation(c.id, { pinned: !c.pinned }).catch((e) => toast.error(e.message)); }}>
              {c.pinned ? "Unpin" : "Pin to top"}
            </MenuItem>
            <MenuItem icon={<Download className="h-3.5 w-3.5" />} onClick={exportMd}>Export Markdown</MenuItem>
            <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={() => { setMenu(false); setConfirm(true); }}>Delete</MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={deleting}
        title="Delete this conversation?"
        description={`"${c.title}" and all its messages will be permanently deleted.`}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteConversation(c.id);
            setConfirm(false);
            toast.success("Conversation deleted");
            if (active) router.push("/chat");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </motion.div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition", danger ? "text-red-500 hover:bg-red-500/10" : "text-fg hover:bg-hover")}>
      {icon}
      {children}
    </button>
  );
}
