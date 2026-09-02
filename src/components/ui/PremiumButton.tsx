import type { CSSProperties } from "react";
import { GestureIcon } from "./GestureIcon";

export type PremiumButtonProps = {
  children: string;
  href?: string;
  tone?: "ink" | "ember" | "paper";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  hand?: boolean;
};

/**
 * The label rolls one glyph at a time on hover, which needs two stacked copies
 * of every character. Both copies used to be real DOM text, so crawlers and
 * link previews read the label twice, letter by letter: "BBooookk aa ccaallll".
 * The copies are now CSS pseudo-elements fed by `data-glyph`, and the one
 * readable copy of the label is the visually hidden span.
 */
function RollingLabel({ label }: { label: string }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="premium-cta-label">
        {Array.from(label).map((glyph, index) => (
          <span className="premium-cta-glyph" key={`${glyph}-${index}`}>
            <span
              className="premium-cta-glyph-track"
              data-glyph={glyph === " " ? "\u00A0" : glyph}
              style={{ "--glyph-index": index } as CSSProperties}
            />
          </span>
        ))}
      </span>
    </>
  );
}

export function PremiumButton({
  children,
  href,
  tone = "ink",
  className = "",
  type = "button",
  onClick,
  disabled = false,
  hand = true,
}: PremiumButtonProps) {
  const buttonClass =
    `premium-cta premium-cta--${tone} ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`.trim();
  const label = <RollingLabel label={children} />;

  return (
    <span className="premium-cta-cluster">
      {hand && !disabled && (
        <span aria-hidden="true" className="premium-cta-hand-track">
          <span className="premium-cta-hand-marker">
            <GestureIcon
              className="premium-cta-hand premium-cta-hand--point"
              gesture="point"
            />
            <GestureIcon
              className="premium-cta-hand premium-cta-hand--peace"
              gesture="peace"
            />
          </span>
        </span>
      )}
      {href ? (
        <a aria-label={children} className={buttonClass} href={href}>
          {label}
        </a>
      ) : (
        <button
          aria-label={children}
          className={buttonClass}
          disabled={disabled}
          onClick={onClick}
          type={type}
        >
          {label}
        </button>
      )}
    </span>
  );
}
