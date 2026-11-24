"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { CATEGORIES } from "@/utils/constants";
import type { Category } from "@/utils/types";
import { cn } from "@/utils/cn";

export function ModePicker({ value, onChange, up = true }: { value: Category; onChange: (c: Category) => void; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = CATEGORIES.find((c) => c.id === value)!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-xl border border-line px-2.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-fg"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Conversation mode"
      >
        <span>{current.emoji}</span>
        <span>{current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: up ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: up ? 6 : -6, scale: 0.97 }}
            className={cn("absolute left-0 z-30 w-60 rounded-2xl border border-line bg-panel-solid p-1.5 shadow-2xl", up ? "bottom-10" : "top-10")}
          >
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-hover"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-hover text-base">{c.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{c.label}</span>
                    <span className="block text-xs text-subtle">{c.hint}</span>
                  </span>
                  {c.id === value && <Check className="h-4 w-4 text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
