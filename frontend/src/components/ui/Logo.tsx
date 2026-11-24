import Link from "next/link";
import { cn } from "@/utils/cn";

export function Orb({ size = 32, live = false, className }: { size?: number; live?: boolean; className?: string }) {
  return <span aria-hidden className={cn("orb inline-block shrink-0", live && "is-live", className)} style={{ width: size, height: size }} />;
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <Orb size={28} className="transition-transform duration-500 group-hover:rotate-180" />
      <span className="text-lg">Nova</span>
    </Link>
  );
}
