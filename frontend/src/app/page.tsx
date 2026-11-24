import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Gauge,
  History,
  Lock,
  MessagesSquare,
  Mic,
  Palette,
  ShieldCheck,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { DemoChat } from "@/components/landing/DemoChat";
import { Reveal } from "@/components/landing/Reveal";
import { Aurora } from "@/components/landing/Aurora";
import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time streaming",
    body: "Answers appear word by word over Socket.io. No refresh, no waiting for the whole reply, and every open tab stays in sync.",
    span: "md:col-span-2",
    visual: "stream",
  },
  { icon: Brain, title: "Bring any model", body: "Claude, GPT or any OpenAI-compatible API. An offline demo model means it runs with zero keys." },
  { icon: History, title: "Searchable history", body: "Every conversation is saved to MongoDB. Search titles and message text, pin, rename or export to Markdown." },
  { icon: Lock, title: "Secure accounts", body: "JWT sessions, bcrypt-hashed passwords, input validation, CORS, Helmet and rate limiting on every route." },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Rename your assistant, pick light or dark, choose an accent, a reply language and how long answers should be.",
    visual: "accents",
  },
  { icon: MessagesSquare, title: "Four chat modes", body: "Casual, Professional, Creative and Coding modes each shape the assistant's tone and format." },
  { icon: ThumbsUp, title: "Rate every answer", body: "Thumbs up or down with written feedback, feeding the satisfaction score on the admin dashboard." },
  { icon: Mic, title: "Voice in, voice out", body: "Dictate messages with your microphone and have replies read aloud, right in the browser." },
  {
    icon: BarChart3,
    title: "Admin analytics",
    body: "Live usage, active users, response latency, satisfaction, busiest hours and mode popularity at a glance.",
    span: "md:col-span-2",
    visual: "chart",
  },
  { icon: Gauge, title: "Fast and resilient", body: "Repeat questions are cached, failed AI calls retry, requests time out cleanly, and chat falls back to HTTP if WebSockets drop." },
];

const STEPS = [
  { n: "01", title: "Create an account", body: "Sign up in seconds. Your session is secured with a signed JWT." },
  { n: "02", title: "Ask anything", body: "Your message travels to the server over a WebSocket and joins the conversation context." },
  { n: "03", title: "Watch it think", body: "The AI's answer streams back token by token and renders as rich Markdown with code highlighting." },
  { n: "04", title: "Pick up anytime", body: "Everything is saved, so you can search, revisit or export any past conversation." },
];

const STACK = ["Next.js", "React", "Tailwind CSS", "Node.js", "Express", "Socket.io", "MongoDB", "Mongoose", "JWT", "Claude API", "OpenAI API", "Recharts", "Motion"];

function FeatureVisual({ kind }: { kind?: string }) {
  if (kind === "stream")
    return (
      <div className="mt-6 space-y-2 rounded-2xl border border-line bg-elev/60 p-4 font-mono text-xs text-muted">
        <div><span className="text-accent">→</span> chat:send <span className="text-subtle">{"{ content: \"Hi Nova\" }"}</span></div>
        <div><span className="text-emerald-400">←</span> chat:start</div>
        <div><span className="text-emerald-400">←</span> chat:token <span className="text-fg">&quot;Hello&quot;</span> <span className="text-fg">&quot; there!&quot;</span> <span className="text-fg">&quot; 👋&quot;</span><span className="caret" /></div>
      </div>
    );
  if (kind === "accents")
    return (
      <div className="mt-5 flex gap-2">
        {["#7c5cff,#38bdf8", "#3b82f6,#22d3ee", "#10b981,#84cc16", "#f43f5e,#fb923c", "#f59e0b,#ef4444"].map((c) => (
          <span key={c} className="h-7 w-7 rounded-full ring-2 ring-line" style={{ background: `linear-gradient(135deg,${c})` }} />
        ))}
      </div>
    );
  if (kind === "chart")
    return (
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {[30, 45, 38, 60, 52, 70, 64, 82, 75, 90, 86, 100].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-accent-gradient opacity-80 transition-all duration-500 group-hover:opacity-100" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  return null;
}

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40">
        <Aurora />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Real-time AI · streamed over WebSockets
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Conversations
                <br />
                that feel{" "}
                <span className="font-display text-gradient pr-2 text-6xl font-normal italic sm:text-7xl lg:text-[5.4rem]">alive.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                Nova is an AI assistant that answers in real time, remembers every conversation, and adapts to how you like to work.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-accent-gradient px-6 font-medium text-white shadow-[0_12px_40px_-10px_rgb(var(--accent)/0.8)] transition hover:brightness-110"
                >
                  Start chatting free <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link href="/login?demo=1" className="glass inline-flex h-12 items-center gap-2 rounded-2xl px-6 font-medium transition hover:bg-hover">
                  Try the demo account
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
                {["No credit card", "Streams in real time", "Dark & light themes"].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" /> {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="flex justify-center lg:justify-end">
            <DemoChat />
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-elev/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          {[
            ["< 50 ms", "socket round trip"],
            ["4", "conversation modes"],
            ["100%", "history saved"],
            ["3", "AI providers supported"],
          ].map(([v, l], i) => (
            <Reveal key={l} delay={i * 0.05} className="text-center">
              <div className="text-3xl font-semibold tracking-tight sm:text-4xl">{v}</div>
              <div className="mt-1 text-sm text-muted">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Features</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything a modern <span className="font-display italic font-normal text-gradient">assistant</span> needs
          </h2>
          <p className="mt-4 text-muted">From the first keystroke to the admin dashboard, every part of the experience is built in.</p>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className={f.span}>
              <div className="group glass relative h-full overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_20px_60px_-20px_rgb(var(--accent)/0.35)]">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[rgb(var(--accent)/0.12)] opacity-0 blur-2xl transition group-hover:opacity-100" />
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgb(var(--accent)/0.12)] text-accent ring-1 ring-[rgb(var(--accent)/0.25)]">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                <FeatureVisual kind={f.visual} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative scroll-mt-24 border-y border-line bg-elev/40 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">From question to answer in milliseconds</h2>
          </Reveal>
          <div className="relative mt-14 grid gap-8 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent)/0.5)] to-transparent md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative">
                  <span className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-panel-solid font-mono text-sm font-semibold text-accent shadow-lg">
                    {s.n}
                  </span>
                  <h3 className="mt-5 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="scroll-mt-24 py-20">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Built with</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">A production-grade, full-stack toolkit</h2>
        </Reveal>
        <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-3 hover:[animation-play-state:paused]">
            {[...STACK, ...STACK].map((t, i) => (
              <span key={i} className="glass whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-line p-10 text-center sm:p-16">
            <div className="absolute inset-0 -z-10 bg-accent-gradient opacity-[0.14]" />
            <div className="absolute -bottom-32 left-1/2 -z-10 h-72 w-[600px] -translate-x-1/2 rounded-full bg-[rgb(var(--accent)/0.35)] blur-[100px]" />
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Ready to meet <span className="font-display italic font-normal text-gradient">Nova</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">Create a free account and start your first conversation in under a minute.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-accent-gradient px-7 font-medium text-white shadow-xl transition hover:brightness-110">
                Create free account <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className="glass inline-flex h-12 items-center rounded-2xl px-7 font-medium transition hover:bg-hover">
                I have an account
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
          <Logo />
          <p>Built for the Labmentix internship · Next.js · Express · Socket.io · MongoDB</p>
        </div>
      </footer>
    </div>
  );
}
