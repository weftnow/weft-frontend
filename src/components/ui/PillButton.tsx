"use client";

const styles = {
  solid: "bg-ember text-paper",
  outline: "bg-transparent text-ink ring-1 ring-inset ring-ink/15",
  light: "bg-paper text-ink",
} as const;

export function PillButton({
  children,
  href,
  variant = "solid",
  className = "",
}: {
  children: string;
  href?: string;
  variant?: keyof typeof styles;
  className?: string;
}) {
  const cls = `group inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-medium transition-transform duration-300 hover:scale-[1.02] ${styles[variant]} ${className}`;

  const content = (
    <span className="relative block h-[1.25em] overflow-hidden leading-[1.25em]">
      <span className="block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute left-0 top-full block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full motion-reduce:hidden"
      >
        {children}
      </span>
    </span>
  );

  return href ? (
    <a href={href} className={cls}>
      {content}
    </a>
  ) : (
    <button type="button" className={cls}>
      {content}
    </button>
  );
}
