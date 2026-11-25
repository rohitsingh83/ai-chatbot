"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CalendarPlus, Check, Copy, Languages, Loader2, RotateCcw, ThumbsDown, ThumbsUp, Volume2, VolumeX, X, Zap } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { Markdown } from "./Markdown";
import { AttachmentChip, ToolSteps } from "./ToolSteps";
import { Orb } from "@/components/ui/Logo";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clockTime, initials } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Message, ToolStep } from "@/utils/types";

const TRANSLATE_TO = ["English", "Hindi", "Spanish", "French", "German", "Japanese", "Chinese", "Arabic", "Portuguese", "Bengali", "Tamil"];

/** Strip Markdown so the text reads cleanly outside the app. */
const plainText = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/[#*_`>|]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Google Calendar "create event" link, prefilled from a reply (no OAuth needed). */
function calendarUrl(content: string) {
  const text = plainText(content);
  const title = text.split("\n").find((l) => l.trim().length > 3)?.trim().slice(0, 80) || "Nova reminder";
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, details: `${text.slice(0, 1500)}\n\nSaved from Nova` });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function TranslateMenu({ onPick, busy }: { onPick: (lang: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <ActionButton
        label="Translate"
        onClick={() => {
          // Open upwards unless the button is close to the top of the screen.
          setUp((ref.current?.getBoundingClientRect().top ?? 999) > 340);
          setOpen((o) => !o);
        }}
        active={open}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
      </ActionButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            className={cn("absolute left-0 z-30 w-44 rounded-2xl border border-line bg-panel-solid p-1.5 shadow-2xl", up ? "bottom-9" : "top-9")}
          >
            <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">Translate to</div>
            <div className="max-h-60 overflow-y-auto">
              {TRANSLATE_TO.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setOpen(false);
                    onPick(l);
                  }}
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-hover"
                >
                  {l}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Props = {
  message: Message;
  botName: string;
  userName: string;
  isLast: boolean;
  onRate: (rating: -1 | 0 | 1, feedback?: string) => Promise<void>;
  onRegenerate?: () => void;
};

export const MessageBubble = memo(function MessageBubble({ message: m, botName, userName, isLast, onRate, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState(m.feedback || "");
  const [translation, setTranslation] = useState<{ language: string; text: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  const translate = async (language: string) => {
    setTranslating(true);
    try {
      const r = await api.translate(m.conversation, m.id, language);
      setTranslation({ language: r.language, text: r.translation });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTranslating(false);
    }
  };

  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group flex justify-end gap-3">
        <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
          {!!m.attachments?.length && (
            <div className={cn("mb-1.5 flex flex-wrap justify-end gap-1.5", m.pending && "opacity-70")}>
              {m.attachments.map((f, i) => (
                <AttachmentChip key={`${f.name}-${i}`} file={f} />
              ))}
            </div>
          )}
          {m.content && (
            <div className={cn("whitespace-pre-wrap rounded-3xl rounded-br-lg bg-accent-gradient px-4 py-2.5 text-[0.95rem] leading-relaxed text-white shadow-[0_8px_24px_-12px_rgb(var(--accent)/0.7)]", m.pending && "opacity-70")}>
              {m.content}
            </div>
          )}
          <span className="mt-1 px-1 text-[11px] text-subtle opacity-0 transition group-hover:opacity-100">{m.pending ? "Sending…" : clockTime(m.createdAt)}</span>
        </div>
        <span className="mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-elev text-xs font-semibold text-muted sm:grid">{initials(userName)}</span>
      </motion.div>
    );
  }

  const copy = () => {
    navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return toast.error("Text-to-speech isn't supported in this browser");
    if (speaking) {
      speechSynthesis.cancel();
      return setSpeaking(false);
    }
    const plain = m.content.replace(/```[\s\S]*?```/g, " (code block) ").replace(/[#*_`>|]/g, "");
    const u = new SpeechSynthesisUtterance(plain);
    u.onend = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const rate = async (r: -1 | 1) => {
    const next = m.rating === r ? 0 : r;
    try {
      await onRate(next);
      if (next === -1) setFeedbackOpen(true);
      else if (next === 1) toast.success("Thanks for the feedback!");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group flex gap-3">
      <Orb size={30} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-semibold text-fg">{botName}</span>
          <span className="text-subtle">{clockTime(m.createdAt)}</span>
          {m.cached && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500" title="Served from cache">
              <Zap className="h-2.5 w-2.5" /> cached
            </span>
          )}
        </div>
        <ToolSteps steps={m.tools} />
        {m.error ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{m.content}</p>
              {isLast && onRegenerate && (
                <button onClick={onRegenerate} className="mt-2 inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Try again
                </button>
              )}
            </div>
          </div>
        ) : (
          <Markdown content={m.content} />
        )}
        <AnimatePresence>
          {translation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl border border-[rgb(var(--accent)/0.3)] bg-[rgb(var(--accent)/0.05)]"
            >
              <div className="flex items-center justify-between border-b border-[rgb(var(--accent)/0.2)] px-4 py-2 text-xs font-medium text-accent">
                <span className="flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" /> Translated to {translation.language}
                </span>
                <button onClick={() => setTranslation(null)} className="rounded p-0.5 hover:bg-hover" aria-label="Hide translation">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="px-4 py-3">
                <Markdown content={translation.text} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!m.error && (
          <div className={cn("mt-2 flex items-center gap-0.5 transition", isLast || m.rating !== 0 ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}>
            <ActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionButton>
            <ActionButton label="Good response" onClick={() => rate(1)} active={m.rating === 1}>
              <ThumbsUp className={cn("h-3.5 w-3.5", m.rating === 1 && "fill-current")} />
            </ActionButton>
            <ActionButton label="Bad response" onClick={() => rate(-1)} active={m.rating === -1} danger>
              <ThumbsDown className={cn("h-3.5 w-3.5", m.rating === -1 && "fill-current")} />
            </ActionButton>
            <ActionButton label={speaking ? "Stop reading" : "Read aloud"} onClick={speak} active={speaking}>
              {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </ActionButton>
            <TranslateMenu onPick={translate} busy={translating} />
            <ActionButton label="Add to Google Calendar" onClick={() => window.open(calendarUrl(m.content), "_blank", "noopener,noreferrer")}>
              <CalendarPlus className="h-3.5 w-3.5" />
            </ActionButton>
            {isLast && onRegenerate && (
              <ActionButton label="Regenerate" onClick={onRegenerate}>
                <RotateCcw className="h-3.5 w-3.5" />
              </ActionButton>
            )}
            {!!m.latencyMs && !m.cached && <span className="ml-2 text-[11px] text-subtle">{(m.latencyMs / 1000).toFixed(1)}s</span>}
          </div>
        )}
      </div>

      <Modal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Help us improve" description={`What could ${botName} have done better?`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {["Not accurate", "Too long", "Too short", "Didn't follow instructions", "Not helpful"].map((t) => (
            <button
              key={t}
              onClick={() => setFeedback((f) => (f.includes(t) ? f : f ? `${f}, ${t}` : t))}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-fg"
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Tell us more (optional)"
          className="w-full resize-none rounded-xl border border-line bg-elev p-3 text-sm outline-none focus:border-accent"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setFeedbackOpen(false)}>Skip</Button>
          <Button
            onClick={async () => {
              try {
                await onRate(-1, feedback);
                setFeedbackOpen(false);
                toast.success("Feedback sent. Thank you!");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Send feedback
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
});

function ActionButton({ label, onClick, active, danger, children }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-lg p-1.5 transition",
        active ? (danger ? "bg-red-500/10 text-red-500" : "bg-[rgb(var(--accent)/0.12)] text-accent") : "text-subtle hover:bg-hover hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

export function StreamingBubble({ text, phase, botName, tools }: { text: string; phase: "thinking" | "streaming"; botName: string; tools?: ToolStep[] }) {
  const running = tools?.some((t) => t.status === "running");
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3" aria-live="polite">
      <Orb size={30} live className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold">{botName}</div>
        <ToolSteps steps={tools} live />
        {phase === "thinking" || !text ? (
          <div className="flex items-center gap-3 py-1.5">
            <span className="flex gap-1">
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="shimmer-text text-sm font-medium">{running ? "Working on it…" : tools?.length ? `${botName} is writing…` : `${botName} is thinking…`}</span>
          </div>
        ) : (
          <div className="caret-last">
            <Markdown content={text} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
