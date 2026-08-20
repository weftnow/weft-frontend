/**
 * The dashboard's icon set.
 *
 * Hand-authored rather than a package: nine glyphs do not justify a
 * dependency, and drawing them here guarantees the one thing a mixed set never
 * gets right — a single stroke weight and cap style across every screen. All
 * of them inherit `currentColor` and size from the CSS, so a glyph never
 * carries its own colour decision.
 *
 * Every icon here sits beside a text label, so each is `aria-hidden`: an
 * announced "calendar, Events" is worse for a screen reader than "Events".
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

export function ArrowLeftIcon() {
  return (
    <svg {...BASE}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg {...BASE}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...BASE}>
      <rect height="16" rx="3" width="18" x="3" y="5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function LogOutIcon() {
  return (
    <svg {...BASE}>
      <path d="M9 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h3" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...BASE} strokeWidth={2.6}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...BASE}>
      <rect height="11" rx="2.5" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...BASE}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...BASE}>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...BASE}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-2" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg {...BASE}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.6a6.5 6.5 0 0 1 3.5 5.4" />
    </svg>
  );
}
