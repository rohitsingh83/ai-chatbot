export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[rgb(var(--accent)/0.28)] blur-[120px]" />
      <div className="animate-float absolute top-40 -left-32 h-[380px] w-[380px] rounded-full bg-[rgb(var(--accent-2)/0.22)] blur-[100px]" />
      <div className="animate-float absolute top-72 -right-24 h-[420px] w-[420px] rounded-full bg-[rgb(var(--accent)/0.2)] blur-[110px] [animation-delay:-4s]" />
    </div>
  );
}
