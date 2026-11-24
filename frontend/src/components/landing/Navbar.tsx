"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/utils/cn";

export function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all duration-300", scrolled ? "py-2" : "py-4")}>
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300",
          scrolled ? "glass mx-4 shadow-lg md:mx-auto" : "border border-transparent"
        )}
      >
        <Logo />
        <div className="hidden items-center gap-1 text-sm text-muted md:flex">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Tech", "#stack"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-1.5 transition hover:bg-hover hover:text-fg">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/chat" className="group inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-gradient px-4 text-sm font-medium text-white shadow-lg">
              Open chat <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-9 items-center rounded-xl px-3 text-sm font-medium text-muted hover:bg-hover hover:text-fg sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="group inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-gradient px-4 text-sm font-medium text-white shadow-lg">
                Get started <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
