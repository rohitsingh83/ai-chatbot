"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Orb } from "@/components/ui/Logo";

const SCRIPT = [
  {
    mode: "💻 Coding",
    user: "How do I debounce a function in JavaScript?",
    bot: "Wrap it so it only runs after a pause:\n\nconst debounce = (fn, ms) => {\n  let t;\n  return (...a) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...a), ms);\n  };\n};",
  },
  {
    mode: "🎨 Creative",
    user: "Name a café run by robots ☕",
    bot: "A few ideas:\n• Byte & Brew\n• Latte.exe\n• The Steam Engine\n• Circuit Café",
  },
  {
    mode: "💼 Professional",
    user: "Summarise WebSockets for a PM",
    bot: "• Instant updates, no refresh\n• Lower latency than polling\n• Powers chat, live dashboards and collaboration",
  },
];

type Phase = "typing-user" | "thinking" | "streaming" | "done";

export function DemoChat() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing-user");
  const [userText, setUserText] = useState("");
  const [botText, setBotText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Subtle 3D tilt following the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  useEffect(() => {
    const s = SCRIPT[i];
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      setUserText("");
      setBotText("");
      setPhase("typing-user");
      for (let k = 1; k <= s.user.length; k++) {
        if (cancelled) return;
        setUserText(s.user.slice(0, k));
        await wait(28);
      }
      await wait(250);
      setPhase("thinking");
      await wait(900);
      setPhase("streaming");
      const words = s.bot.match(/\s+|\S+/g) || [];
      let acc = "";
      for (const w of words) {
        if (cancelled) return;
        acc += w;
        setBotText(acc);
        await wait(/\S/.test(w) ? 45 : 0);
      }
      setPhase("done");
      await wait(2600);
      if (!cancelled) setI((x) => (x + 1) % SCRIPT.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [i]);

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className="relative w-full max-w-xl"
    >
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-gradient opacity-25 blur-3xl" />
      <div className="glass overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Orb size={26} live={phase === "thinking" || phase === "streaming"} />
            <div>
              <div className="text-sm font-semibold">Nova</div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" /> Online · streaming
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.span
              key={SCRIPT[i].mode}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="rounded-full border border-line bg-hover px-2.5 py-1 text-[11px] font-medium text-muted"
            >
              {SCRIPT[i].mode}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex h-[300px] flex-col gap-4 p-5 text-sm sm:h-[320px]">
          {userText && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent-gradient px-4 py-2.5 text-white shadow-lg">
              {userText}
            </motion.div>
          )}
          {phase === "thinking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
              <Orb size={22} live />
              <span className="shimmer-text text-sm font-medium">Thinking…</span>
            </motion.div>
          )}
          {(phase === "streaming" || phase === "done") && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-[90%] gap-2.5">
              <Orb size={22} className="mt-0.5" />
              <div className={`whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-elev/70 px-4 py-2.5 font-[450] leading-relaxed ${botText.includes("=>") ? "font-mono text-[12px]" : ""} ${phase === "streaming" ? "caret" : ""}`}>
                {botText}
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-elev/60 py-2 pl-4 pr-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="flex-1 truncate text-sm text-subtle">Ask Nova anything…</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-gradient text-white">
              <ArrowUp className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
