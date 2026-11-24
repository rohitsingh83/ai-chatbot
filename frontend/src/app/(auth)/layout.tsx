import { Logo, Orb } from "@/components/ui/Logo";
import { Aurora } from "@/components/landing/Aurora";

const BUBBLES = [
  { me: true, text: "Can you help me prep for my internship interview?" },
  { me: false, text: "Absolutely! Let's start with the 5 questions interviewers ask most, then we'll practise your answers together. 🚀" },
  { me: true, text: "Perfect, let's go" },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-subtle">Protected with JWT sessions and bcrypt password hashing.</p>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line lg:flex lg:items-center lg:justify-center">
        <Aurora />
        <div className="relative w-full max-w-md px-8">
          <Orb size={64} live className="mb-10" />
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Your thinking partner,
            <br />
            <span className="font-display text-5xl font-normal italic text-gradient">always on.</span>
          </h2>
          <div className="mt-10 space-y-3">
            {BUBBLES.map((b, i) => (
              <div
                key={i}
                className={`glass max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-lg ${b.me ? "ml-auto rounded-br-md" : "rounded-tl-md"}`}
                style={{ animation: `float 7s ease-in-out ${i * -2}s infinite` }}
              >
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
