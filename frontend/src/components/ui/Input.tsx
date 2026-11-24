import { forwardRef } from "react";
import { cn } from "@/utils/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; error?: string }>(
  function Input({ className, icon, error, ...props }, ref) {
    return (
      <div>
        <div className="relative">
          {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">{icon}</span>}
          <input
            ref={ref}
            aria-invalid={!!error}
            className={cn(
              "h-11 w-full rounded-xl border border-line bg-elev px-3.5 text-sm text-fg placeholder:text-subtle outline-none transition",
              "focus:border-accent focus:ring-4 focus:ring-[rgb(var(--accent)/0.15)]",
              error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/15",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {children}
    </label>
  );
}
