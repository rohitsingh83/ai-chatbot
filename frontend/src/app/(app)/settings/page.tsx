"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, KeyRound, Laptop, LogOut, Moon, Sparkles, Sun, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useChat } from "@/lib/chat-context";
import { api } from "@/services/api";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { Orb } from "@/components/ui/Logo";
import { ACCENTS, CATEGORIES } from "@/utils/constants";
import { cn } from "@/utils/cn";
import type { Preferences } from "@/utils/types";

const LANGUAGES = ["auto", "English", "Hindi", "Spanish", "French", "German", "Japanese", "Portuguese", "Arabic", "Chinese"];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-elev/60 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn("relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition", value === o.id ? "text-fg" : "text-muted hover:text-fg")}
        >
          {value === o.id && <motion.span layoutId={`seg-${options.map((x) => x.id).join()}`} className="absolute inset-0 rounded-xl bg-panel-solid shadow ring-1 ring-line" />}
          <span className="relative flex items-center gap-2">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser, replaceToken } = useAuth();
  const { clearAll } = useChat();
  const p = user!.preferences;
  const [name, setName] = useState(user!.name);
  const [botName, setBotName] = useState(p.botName);
  const [instructions, setInstructions] = useState(p.customInstructions || "");
  const [signingOut, setSigningOut] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const save = async (prefs: Partial<Preferences>, msg = "Preferences saved") => {
    try {
      await updateUser({ preferences: prefs });
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader title="Settings" subtitle="Personalise your assistant and manage your account" />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Section title="Assistant" description="Give your assistant a name and decide how it talks to you.">
            <div className="space-y-5">
              <div>
                <Label htmlFor="botName">Assistant name</Label>
                <div className="flex gap-2">
                  <Input id="botName" value={botName} maxLength={40} onChange={(e) => setBotName(e.target.value)} />
                  <Button variant="secondary" disabled={!botName.trim() || botName.trim() === p.botName} onClick={() => save({ botName: botName.trim() }, `Your assistant is now called ${botName.trim()}`)}>
                    Save
                  </Button>
                </div>
              </div>
              <div>
                <Label>Default mode for new chats</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => save({ defaultCategory: c.id })}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                        p.defaultCategory === c.id ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.08)]" : "border-line hover:border-line-strong"
                      )}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{c.label}</span>
                        <span className="block text-xs text-muted">{c.hint}</span>
                      </span>
                      {p.defaultCategory === c.id && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Response length</Label>
                <Segmented
                  value={p.responseLength}
                  onChange={(v) => save({ responseLength: v })}
                  options={[
                    { id: "concise", label: "Concise" },
                    { id: "balanced", label: "Balanced" },
                    { id: "detailed", label: "Detailed" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="language">Reply language</Label>
                <select
                  id="language"
                  value={p.language}
                  onChange={(e) => save({ language: e.target.value })}
                  className="h-11 w-full rounded-xl border border-line bg-elev px-3 text-sm outline-none focus:border-accent sm:w-64"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l === "auto" ? "Match my language (auto)" : l}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line p-4">
                <span>
                  <span className="block text-sm font-medium">Send with Enter</span>
                  <span className="block text-xs text-muted">When off, use Ctrl + Enter to send and Enter for new lines.</span>
                </span>
                <button
                  role="switch"
                  aria-checked={p.sendOnEnter}
                  onClick={() => save({ sendOnEnter: !p.sendOnEnter })}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition", p.sendOnEnter ? "bg-accent" : "bg-line-strong")}
                >
                  <motion.span layout className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow", p.sendOnEnter ? "right-0.5" : "left-0.5")} />
                </button>
              </label>
            </div>
          </Section>

          <Section
            title="Custom instructions"
            description={`Tune ${p.botName} to you. These instructions are added to every conversation.`}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                "I'm a computer science student. Explain things simply with examples.",
                "Always reply in bullet points.",
                "I'm preparing for interviews. Quiz me at the end of answers.",
                "Prefer TypeScript and React in code examples.",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInstructions((v) => (v ? `${v}\n${ex}` : ex).slice(0, 1500))}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-fg"
                >
                  + {ex}
                </button>
              ))}
            </div>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, 1500))}
              rows={5}
              placeholder="What should the assistant know about you, and how should it respond?"
              aria-label="Custom instructions"
              className="w-full resize-y rounded-2xl border border-line bg-elev p-4 text-sm leading-relaxed outline-none focus:border-accent focus-visible:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs tabular-nums text-subtle">{instructions.length.toLocaleString()} / 1,500</span>
              <div className="flex gap-2">
                {p.customInstructions && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setInstructions("");
                      save({ customInstructions: "" }, "Custom instructions cleared");
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button disabled={instructions.trim() === (p.customInstructions || "")} onClick={() => save({ customInstructions: instructions.trim() }, "Custom instructions saved")}>
                  <Sparkles className="h-4 w-4" /> Save instructions
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Appearance" description="Changes apply instantly across the app.">
            <div className="space-y-5">
              <div>
                <Label>Theme</Label>
                <Segmented
                  value={p.theme}
                  onChange={(v) => save({ theme: v }, "Theme updated")}
                  options={[
                    { id: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
                    { id: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
                    { id: "system", label: "System", icon: <Laptop className="h-4 w-4" /> },
                  ]}
                />
              </div>
              <div>
                <Label>Accent colour</Label>
                <div className="flex flex-wrap gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => save({ accent: a.id }, `${a.label} accent applied`)}
                      className={cn("group flex flex-col items-center gap-1.5")}
                      aria-label={`${a.label} accent`}
                      aria-pressed={p.accent === a.id}
                    >
                      <span
                        className={cn("grid h-11 w-11 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg)] transition group-hover:scale-110", p.accent === a.id ? "ring-fg" : "ring-transparent")}
                        style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                      >
                        {p.accent === a.id && <Check className="h-4 w-4 text-white" />}
                      </span>
                      <span className="text-xs text-muted">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Profile">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Display name</Label>
                <div className="flex gap-2">
                  <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} icon={<UserRound className="h-4 w-4" />} />
                  <Button
                    variant="secondary"
                    disabled={name.trim().length < 2 || name.trim() === user!.name}
                    onClick={() => updateUser({ name: name.trim() }).then(() => toast.success("Name updated"), (e) => toast.error(e.message))}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user!.email} disabled className="opacity-70" />
              </div>
            </div>
          </Section>

          <Section title="Password & sessions" description="Changing your password signs you out everywhere else. Use at least 8 characters with a number.">
            <form
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={async (e) => {
                e.preventDefault();
                setPwLoading(true);
                try {
                  const r = await api.changePassword(pw);
                  replaceToken(r.token);
                  setPw({ currentPassword: "", newPassword: "" });
                  toast.success("Password changed. Other devices were signed out.");
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setPwLoading(false);
                }
              }}
            >
              <Input type="password" placeholder="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} icon={<KeyRound className="h-4 w-4" />} />
              <Input type="password" placeholder="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} icon={<KeyRound className="h-4 w-4" />} />
              <Button type="submit" variant="secondary" loading={pwLoading} disabled={!pw.currentPassword || pw.newPassword.length < 8}>
                Update
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-muted">Lost a device or used a shared computer? End every other session.</p>
              <Button
                variant="secondary"
                loading={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    const r = await api.logoutAll();
                    replaceToken(r.token);
                    toast.success("Signed out of all other devices");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out other devices
              </Button>
            </div>
          </Section>

          <Section title="Danger zone">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">Permanently delete all of your conversations and messages.</p>
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" /> Delete all chats
              </Button>
            </div>
          </Section>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Live preview</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent-gradient px-3.5 py-2 text-white">Hey! Who are you?</div>
              <div className="flex gap-2">
                <Orb size={24} />
                <div className="rounded-2xl rounded-tl-md border border-line bg-elev px-3.5 py-2">
                  Hi {user!.name.split(" ")[0]}! I&apos;m <b>{botName || p.botName}</b>
                  {p.language !== "auto" ? ` and I'll reply in ${p.language}` : ""}. {CATEGORIES.find((c) => c.id === p.defaultCategory)?.emoji}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={clearing}
        title="Delete all conversations?"
        description="This permanently removes every chat and message in your account. This can't be undone."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          setClearing(true);
          try {
            await clearAll();
            toast.success("All conversations deleted");
            setConfirm(false);
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setClearing(false);
          }
        }}
      />
    </div>
  );
}
