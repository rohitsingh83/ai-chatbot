"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Calculator, Check, Clock, CloudSun, Hourglass, FileCode2, FileSpreadsheet, FileText, Globe, Library, Loader2, Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Attachment, ToolStep } from "@/utils/types";

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOOL_ICON[name] || Search;
  return <Icon className={className} />;
}

const TOOL_ICON: Record<string, typeof Search> = {
  web_search: Search,
  read_webpage: Globe,
  get_weather: CloudSun,
  calculate: Calculator,
  get_current_time: Clock,
  wikipedia: Library,
  wait: Hourglass,
};

/** The steps Nova took for a reply, e.g. "Searching the web for …", shown as small live chips. */
export function ToolSteps({ steps, live = false }: { steps?: ToolStep[]; live?: boolean }) {
  if (!steps?.length) return null;
  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Steps taken">
      <AnimatePresence initial={false}>
        {steps.map((s, i) => {
          const running = live && s.status === "running";
          return (
            <motion.span
              key={s.id || `${s.name}-${i}`}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              title={s.error ? `${s.label}: ${s.error}` : s.label}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                s.status === "error"
                  ? "border-amber-500/30 bg-amber-500/[0.07] text-amber-600 dark:text-amber-400"
                  : running
                    ? "border-[rgb(var(--accent)/0.35)] bg-[rgb(var(--accent)/0.08)] text-fg"
                    : "border-line bg-elev text-muted"
              )}
            >
              <ToolIcon name={s.name} className={cn("h-3.5 w-3.5 shrink-0", running && "text-accent")} />
              <span className={cn("truncate", running && "shimmer-text font-medium")}>{s.label}</span>
              {running ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-accent" />
              ) : s.status === "error" ? (
                <AlertCircle className="h-3 w-3 shrink-0" />
              ) : (
                <Check className="h-3 w-3 shrink-0 text-emerald-500" />
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function FileIcon({ name, type = "", className }: { name: string; type?: string; className?: string }) {
  if (/csv|sheet|excel/.test(type) || /\.(csv|tsv|xlsx?)$/i.test(name)) return <FileSpreadsheet className={className} />;
  if (/\.(js|jsx|ts|tsx|py|java|c|cpp|cs|go|rs|rb|php|html?|css|json|sql|sh|ya?ml)$/i.test(name)) return <FileCode2 className={className} />;
  return <FileText className={className} />;
}

export const fileSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** A file chip: on user messages, and (with onRemove/loading) in the composer. */
export function AttachmentChip({
  file,
  onRemove,
  loading,
  inverted,
}: {
  file: Pick<Attachment, "name" | "type" | "size">;
  onRemove?: () => void;
  loading?: boolean;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[16rem] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs",
        inverted ? "border-white/25 bg-white/15 text-white" : "border-line bg-elev text-fg"
      )}
    >
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", inverted ? "bg-white/20" : "bg-[rgb(var(--accent)/0.12)] text-accent")}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileIcon name={file.name} type={file.type} className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{file.name}</span>
        <span className={cn("block text-[10px]", inverted ? "text-white/75" : "text-subtle")}>{loading ? "Reading…" : fileSize(file.size)}</span>
      </span>
      {onRemove && (
        <button onClick={onRemove} className="rounded-md p-0.5 text-subtle hover:bg-hover hover:text-fg" aria-label={`Remove ${file.name}`}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
