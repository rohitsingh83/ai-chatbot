"use client";

import { memo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, Copy, RotateCcw, ThumbsDown, ThumbsUp, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "./Markdown";
import { Orb } from "@/components/ui/Logo";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clockTime, initials } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Message } from "@/utils/types";

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

  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group flex justify-end gap-3">
        <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
          <div className={cn("whitespace-pre-wrap rounded-3xl rounded-br-lg bg-accent-gradient px-4 py-2.5 text-[0.95rem] leading-relaxed text-white shadow-[0_8px_24px_-12px_rgb(var(--accent)/0.7)]", m.pending && "opacity-70")}>
            {m.content}
          </div>
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

export function StreamingBubble({ text, phase, botName }: { text: string; phase: "thinking" | "streaming"; botName: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3" aria-live="polite">
      <Orb size={30} live className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold">{botName}</div>
        {phase === "thinking" || !text ? (
          <div className="flex items-center gap-3 py-1.5">
            <span className="flex gap-1">
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
              <span className="typing-dot h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="shimmer-text text-sm font-medium">{botName} is thinking…</span>
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
