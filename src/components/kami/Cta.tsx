import { ArrowIcon, PlayIcon } from "./Icons";

/**
 * The page's one button shape: a dark pill with an ember disc on its trailing
 * edge. It repeats four times down the page and always says the same thing,
 * so it is a single component rather than four hand-built anchors that drift.
 */
export function Cta({
  label,
  href,
  className = "",
  ...rest
}: {
  label: string;
  href: string;
  className?: string;
} & Omit<React.ComponentProps<"a">, "href" | "className" | "children">) {
  return (
    <a {...rest} className={`kami-cta ${className}`.trim()} href={href}>
      {label}
      <span aria-hidden="true" className="kami-cta__arrow">
        <ArrowIcon />
      </span>
    </a>
  );
}

/** The quiet second action beside it. Leads with the disc instead of trailing it. */
export function GhostCta({
  label,
  href,
  className = "",
}: {
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <a className={`kami-cta kami-cta--ghost ${className}`.trim()} href={href}>
      <span aria-hidden="true" className="kami-cta__arrow">
        <PlayIcon />
      </span>
      {label}
    </a>
  );
}
