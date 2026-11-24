"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Orb } from "@/components/ui/Logo";
import { SUGGESTIONS } from "@/utils/constants";
import { greeting } from "@/utils/format";
import type { Category } from "@/utils/types";

export function EmptyState({ name, botName, category, onPick }: { name: string; botName: string; category: Category; onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14 }} className="relative">
        <div className="absolute inset-0 -z-10 scale-[2.5] rounded-full bg-[rgb(var(--accent)/0.25)] blur-3xl" />
        <Orb size={72} className="animate-float" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        {greeting()}, <span className="font-display font-normal italic text-gradient">{name}</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 text-center text-muted">
        I&apos;m {botName}. How can I help you today?
      </motion.p>
      <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {SUGGESTIONS[category].map((s, i) => (
          <motion.button
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            onClick={() => onPick(s.prompt)}
            className="group glass relative rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent)/0.4)] hover:shadow-[0_12px_40px_-16px_rgb(var(--accent)/0.5)]"
          >
            <div className="flex items-center justify-between text-sm font-medium">
              {s.title}
              <ArrowUpRight className="h-4 w-4 text-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-muted">{s.prompt}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
