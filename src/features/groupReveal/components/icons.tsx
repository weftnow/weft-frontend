/**
 * The reveal's four glyphs.
 *
 * Hand-authored for the same reason the dashboard's set is: four icons do not
 * justify a dependency, and drawing them together is the only way they share
 * one stroke weight and cap style. Each inherits colour and size from the CSS
 * and sits beside a text label, so each is `aria-hidden` — an announced
 * "users, 4 people" is worse than "4 people".
 */

const BASE = {
  "aria-hidden": true,
  fill: "none",
  focusable: false,
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.6,
  viewBox: "0 0 24 24",
} as const;

export function CheckIcon() {
  return (
    <svg {...BASE} strokeWidth={2.4}>
      <path d="m20 6.5-10.5 11L4 12" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg {...BASE}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 19.5a6.2 6.2 0 0 1 12 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6" />
      <path d="M17.6 14.2a5.4 5.4 0 0 1 3.4 5" />
    </svg>
  );
}

export function ConversationIcon() {
  return (
    <svg {...BASE}>
      <path d="M20 13.5a5.5 5.5 0 0 1-5.5 5.5H8l-4 3v-9A5.5 5.5 0 0 1 9.5 7.5h5A5.5 5.5 0 0 1 20 13z" />
      <circle cx="15.5" cy="6.5" r="3.5" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...BASE} strokeWidth={2}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...BASE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6v.4" />
    </svg>
  );
}
