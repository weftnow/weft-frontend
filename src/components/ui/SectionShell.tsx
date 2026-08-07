const acts = {
  light: "bg-paper text-ink",
  warm: "bg-bone text-ink",
  dark: "bg-ink text-paper",
  ember: "bg-ember text-paper",
} as const;

export function SectionShell({
  id,
  act = "warm",
  className = "",
  children,
}: {
  id?: string;
  act?: keyof typeof acts;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden px-6 py-28 md:px-10 md:py-40 ${acts[act]} ${className}`}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
