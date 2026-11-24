"use client";

import { Menu } from "lucide-react";
import { useShell } from "./shell-context";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const { setOpen } = useShell();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl sm:px-8">
      <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-hover lg:hidden" aria-label="Open sidebar">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
