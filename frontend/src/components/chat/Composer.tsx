"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { api } from "@/services/api";
import type { Attachment } from "@/utils/types";
import { AttachmentChip } from "./ToolSteps";

const MAX = 8000;
const MAX_FILES = 5;
const MAX_FILE_CHARS = 30000;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|scss|js|jsx|mjs|cjs|ts|tsx|py|java|c|h|cpp|hpp|cs|go|rs|rb|php|swift|kt|sql|sh|ya?ml|toml|ini|log|r|lua|dart|vue|svelte)$/i;
export const ACCEPT = ".pdf,.txt,.md,.csv,.tsv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql,.sh,.yml,.yaml,.log,text/*,application/pdf,application/json";

type Pending = { key: string; file: Pick<Attachment, "name" | "type" | "size">; data?: Attachment };

/** Read a file into an attachment: text files in the browser, PDFs (and anything else) on the server. */
async function readFile(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 4 MB`);
  const isText = file.type.startsWith("text/") || /json|xml|javascript|csv/.test(file.type) || TEXT_EXT.test(file.name);
  if (isText) {
    let text = (await file.text()).replace(/\r\n/g, "\n").trim();
    if (text.length > MAX_FILE_CHARS) text = `${text.slice(0, MAX_FILE_CHARS)}\n…(file truncated)`;
    return { name: file.name, type: file.type || "text/plain", size: file.size, text };
  }
  const r = await api.extractFile(file);
  return { name: r.name, type: r.type, size: r.size, text: r.text };
}

export type ComposerHandle = { focus: () => void; setText: (t: string) => void };

type Props = {
  onSend: (text: string, attachments: Attachment[]) => Promise<void> | void;
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
  const [files, setFiles] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const room = MAX_FILES - files.length;
    if (room <= 0) return toast.error(`You can attach up to ${MAX_FILES} files`);
    if (incoming.length > room) toast.error(`Only the first ${room} file${room === 1 ? "" : "s"} were added (${MAX_FILES} max)`);
    for (const file of incoming.slice(0, room)) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      setFiles((f) => [...f, { key, file: { name: file.name, type: file.type, size: file.size } }]);
      readFile(file).then(
        (data) => setFiles((f) => f.map((p) => (p.key === key ? { ...p, data } : p))),
        (e) => {
          setFiles((f) => f.filter((p) => p.key !== key));
          toast.error((e as Error).message);
        }
      );
    }
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const reading = files.some((f) => !f.data);

  const submit = async () => {
    const t = text.trim();
    const ready = files.filter((f) => f.data).map((f) => f.data!);
    if ((!t && !ready.length) || busy || disabled) return;
    if (reading) return toast.error("Still reading your file. One moment…");
    if (t.length > MAX) return toast.error(`Messages can be up to ${MAX.toLocaleString()} characters`);
    recRef.current?.stop();
    const keep = files;
    setText("");
    setFiles([]);
    try {
      await onSend(t, ready);
    } catch (e) {
      setText(t);
      setFiles(keep);
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
    <div
      className="relative"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-3xl border-2 border-dashed border-accent bg-[rgb(var(--accent)/0.08)] text-sm font-medium text-accent backdrop-blur-sm">
          Drop files for {botName} to read
        </div>
      )}
      <div
        className={cn(
          "glass rounded-3xl p-2 shadow-[0_10px_50px_-20px_rgb(var(--accent)/0.45)] transition focus-within:border-[rgb(var(--accent)/0.5)] focus-within:shadow-[0_10px_60px_-15px_rgb(var(--accent)/0.55)]",
          listening && "border-red-500/40"
        )}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1.5 pb-1 pt-1.5">
            {files.map((f) => (
              <AttachmentChip key={f.key} file={f.file} loading={!f.data} onRemove={() => setFiles((all) => all.filter((x) => x.key !== f.key))} />
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              const send = sendOnEnter ? !e.shiftKey : e.ctrlKey || e.metaKey;
              if (send) {
                e.preventDefault();
                submit();
              }
            }
          }}
          placeholder={listening ? "Listening… speak now" : files.length ? `Ask ${botName} about ${files.length === 1 ? "this file" : "these files"}…` : `Message ${botName}…`}
          aria-label="Message"
          className="block max-h-[220px] w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[0.95rem] leading-relaxed outline-none focus-visible:outline-none placeholder:text-subtle"
        />
        <div className="flex items-center gap-1.5 px-1 pt-1">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || files.length >= MAX_FILES}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-hover hover:text-fg disabled:opacity-40"
            aria-label="Attach files"
            title="Attach files (PDF, text, code, CSV)"
          >
            <Paperclip className="h-4 w-4" />
          </button>
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
                disabled={(!text.trim() && !files.length) || reading || over || disabled}
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
