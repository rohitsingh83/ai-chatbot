import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Orb } from "@/components/ui/Logo";

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Orb size={44} live />
        <span className="shimmer-text text-sm font-medium">Loading Nova…</span>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  // The app shell reads the URL and the signed-in user on the client, so it streams in after the static loading state.
  return (
    <Suspense fallback={<Loading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
