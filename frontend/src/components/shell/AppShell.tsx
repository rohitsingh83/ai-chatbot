"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "./RequireAuth";
import { ShellProvider } from "./shell-context";
import { Sidebar } from "./Sidebar";
import { ChatProvider } from "@/lib/chat-context";

function Shortcuts() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        router.push("/chat");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ChatProvider>
        <ShellProvider>
          <Shortcuts />
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
          </div>
        </ShellProvider>
      </ChatProvider>
    </RequireAuth>
  );
}
