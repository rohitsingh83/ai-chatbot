"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, Lock, Mail, Sparkles, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { DEMO_ACCOUNTS } from "@/utils/constants";

type Mode = "login" | "signup";

function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
  return s;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, signup, user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  // ?demo=1 (from the landing page) pre-fills the demo account.
  const prefill = mode === "login" && params.get("demo");
  const [email, setEmail] = useState(prefill ? DEMO_ACCOUNTS.user.email : "");
  const [password, setPassword] = useState(prefill ? DEMO_ACCOUNTS.user.password : "");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const next = params.get("next") || "/chat";
  const submitting = useRef(false);

  // Already signed in (e.g. opened /login in a new tab): skip the form.
  useEffect(() => {
    if (!authLoading && user && !submitting.current) router.replace(next);
  }, [authLoading, user, router, next]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "signup" && name.trim().length < 2) e.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email address";
    if (mode === "signup") {
      if (password.length < 8) e.password = "At least 8 characters";
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) e.password = "Use letters and at least one number";
    } else if (!password) e.password = "Password is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    submitting.current = true;
    try {
      const u = mode === "login" ? await login(email, password) : await signup(name, email, password);
      toast.success(mode === "login" ? `Welcome back, ${u.name.split(" ")[0]}!` : `Welcome to Nova, ${u.name.split(" ")[0]}! 🎉`);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else {
        toast.error((err as Error).message);
      }
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  const demo = async (kind: "user" | "admin") => {
    setLoading(true);
    submitting.current = true;
    try {
      const acc = DEMO_ACCOUNTS[kind];
      await login(acc.email, acc.password);
      router.replace(kind === "admin" ? "/admin" : "/chat");
    } catch (err) {
      toast.error((err as Error).message + " (run `npm run seed` in the backend to create demo accounts)");
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(password);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <h1 className="text-3xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login" ? "Log in to continue your conversations." : "Start chatting with Nova in under a minute."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {mode === "signup" && (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} icon={<UserIcon className="h-4 w-4" />} error={errors.name} />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} error={errors.email} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "login" ? "Your password" : "8+ characters with a number"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              error={errors.password}
              className="pr-11"
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-[22px] -translate-y-1/2 rounded-lg p-1.5 text-subtle hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === "signup" && password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? (strength <= 1 ? "bg-red-500" : strength === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-line"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">{["Too weak", "Weak", "Okay", "Strong", "Excellent"][strength]}</span>
            </div>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      {mode === "login" && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" /> or explore instantly <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => demo("user")} disabled={loading}>
              <Sparkles className="h-4 w-4 text-accent" /> Demo user
            </Button>
            <Button variant="secondary" onClick={() => demo("admin")} disabled={loading}>
              <Sparkles className="h-4 w-4 text-accent" /> Demo admin
            </Button>
          </div>
        </>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        {mode === "login" ? "New to Nova? " : "Already have an account? "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-accent hover:underline">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
    </motion.div>
  );
}
