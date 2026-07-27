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
};

function RollingLabel({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="premium-cta-label">
      {Array.from(label).map((glyph, index) => (
        <span className="premium-cta-glyph" key={`${glyph}-${index}`}>
          <span
            className="premium-cta-glyph-track"
            style={{ "--glyph-index": index } as CSSProperties}
          >
            <span>{glyph === " " ? "\u00A0" : glyph}</span>
            <span>{glyph === " " ? "\u00A0" : glyph}</span>
          </span>
        </span>
      ))}
    </span>
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
}: PremiumButtonProps) {
  const buttonClass =
    `premium-cta premium-cta--${tone} ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`.trim();
  const label = <RollingLabel label={children} />;

  return (
    <span className="premium-cta-cluster">
      {!disabled && (
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
