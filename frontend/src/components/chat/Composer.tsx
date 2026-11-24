"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

const MAX = 8000;

export type ComposerHandle = { focus: () => void; setText: (t: string) => void };

type Props = {
  onSend: (text: string) => Promise<void> | void;
  onStop: () => void;
  busy: boolean;
  sendOnEnter: boolean;
  botName: string;
  disabled?: boolean;
  children?: React.ReactNode; // toolbar slot (mode picker)
};

/* Minimal typing for the Web Speech API (not in TS's DOM lib). */
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
};

export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ onSend, onStop, busy, sendOnEnter, botName, disabled, children }, ref) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const baseRef = useRef("");

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    setText: (t: string) => {
      setText(t);
      requestAnimationFrame(() => taRef.current?.focus());
    },
  }));

  // Auto-grow up to ~8 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => () => recRef.current?.stop(), []);

  const submit = async () => {
    const t = text.trim();
    if (!t || busy || disabled) return;
    if (t.length > MAX) return toast.error(`Messages can be up to ${MAX.toLocaleString()} characters`);
    recRef.current?.stop();
    setText("");
    try {
      await onSend(t);
    } catch (e) {
      setText(t);
      toast.error((e as Error).message);
    }
  };

  const toggleVoice = () => {
    if (listening) return recRef.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = text ? `${text.trim()} ` : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setText(baseRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") toast.error(`Voice input error: ${e.error}`);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const over = text.length > MAX;

  return (
    <div className="relative">
      <div
        className={cn(
          "glass rounded-3xl p-2 shadow-[0_10px_50px_-20px_rgb(var(--accent)/0.45)] transition focus-within:border-[rgb(var(--accent)/0.5)] focus-within:shadow-[0_10px_60px_-15px_rgb(var(--accent)/0.55)]",
          listening && "border-red-500/40"
        )}
      >
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              const send = sendOnEnter ? !e.shiftKey : e.ctrlKey || e.metaKey;
              if (send) {
                e.preventDefault();
                submit();
              }
            }
          }}
          placeholder={listening ? "Listening… speak now" : `Message ${botName}…`}
          aria-label="Message"
          className="block max-h-[220px] w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[0.95rem] leading-relaxed outline-none focus-visible:outline-none placeholder:text-subtle"
        />
        <div className="flex items-center gap-1.5 px-1 pt-1">
          <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>
          {text.length > MAX * 0.8 && <span className={cn("text-xs tabular-nums", over ? "text-red-500" : "text-subtle")}>{text.length.toLocaleString()}/{MAX.toLocaleString()}</span>}
          <button
            onClick={toggleVoice}
            className={cn("relative grid h-9 w-9 place-items-center rounded-xl transition", listening ? "bg-red-500 text-white" : "text-muted hover:bg-hover hover:text-fg")}
            aria-label={listening ? "Stop voice input" : "Voice input"}
            title={listening ? "Stop voice input" : "Voice input"}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-xl bg-red-500/40" />}
            <Mic className="relative h-4 w-4" />
          </button>
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.button
                key="stop"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                onClick={onStop}
                className="grid h-9 w-9 place-items-center rounded-xl bg-fg text-bg transition hover:opacity-80"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                onClick={submit}
                disabled={!text.trim() || over || disabled}
                className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient text-white shadow-lg transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
                aria-label="Send message"
                title="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-subtle">
        {sendOnEnter ? "Enter to send · Shift + Enter for a new line" : "Ctrl + Enter to send"} · {botName} can make mistakes, so double-check important info.
      </p>
    </div>
  );
});
