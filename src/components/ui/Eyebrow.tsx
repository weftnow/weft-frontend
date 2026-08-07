export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-meta inline-flex items-center gap-2 rounded-full bg-ink/[0.06] px-3 py-1 text-xs text-ink/70">
      <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden />
      {children}
    </span>
  );
}
