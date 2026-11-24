"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Orb } from "@/components/ui/Logo";

export function RequireAuth({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (admin && user.role !== "admin") router.replace("/chat");
  }, [loading, user, admin, router, pathname]);

  if (loading || !user || (admin && user.role !== "admin")) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Orb size={44} live />
          <span className="shimmer-text text-sm font-medium">Loading Nova…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
