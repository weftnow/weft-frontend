/**
 * The page's line icons, drawn here rather than pulled from a set: there are
 * eight of them, they all share one weight and cap, and a dependency for that
 * is a dependency to keep in step with the brand forever.
 */

type IconProps = { className?: string; size?: number };

function Svg({
  children,
  className = "",
  size = 20,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 14}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

/** Step 01 — an outbound call. */
export function CallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5h-2a2 2 0 0 0-2 2.2 17 17 0 0 0 15 15 2 2 0 0 0 2.2-2v-2a1.4 1.4 0 0 0-1.2-1.4 10 10 0 0 1-2.2-.5 1.4 1.4 0 0 0-1.5.3l-.9.9a14 14 0 0 1-6-6l.9-.9a1.4 1.4 0 0 0 .3-1.5 10 10 0 0 1-.5-2.2 1.4 1.4 0 0 0-1.4-1.2Z" />
      <path d="M16 4.2a5.5 5.5 0 0 1 3.8 3.8" />
      <path d="M15.2 8.1a2.4 2.4 0 0 1 1.4 1.4" />
    </Svg>
  );
}

/** Step 02 — one guest resolving to several relevant people. */
export function MatchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="18.5" cy="6" r="2.2" />
      <circle cx="18.5" cy="18" r="2.2" />
      <path d="M7.6 11.1 16.4 7" />
      <path d="M7.6 12.9 16.4 17" />
    </Svg>
  );
}

/** Step 03 — a host, i.e. a person rather than a process. */
export function HostIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

/** The introduction badge — two people joined. */
export function JoinIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 12}>
      <path d="M8 12h8" />
      <path d="m13 9 3 3-3 3" />
      <path d="m11 9-3 3 3 3" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={props.className}
      height={props.size ?? 10}
      viewBox="0 0 10 12"
      width={props.size ?? 10}
    >
      <path d="M0 0.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L1.2.1A.8.8 0 0 0 0 .8Z" fill="currentColor" />
    </svg>
  );
}

/** Hang up: a handset rotated, which is the only universal "end call". */
export function EndCallIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 18}>
      <path d="M3.2 9.8a16 16 0 0 1 17.6 0l-.6 2.6a1.5 1.5 0 0 1-1.7 1.1l-2.6-.4a1.5 1.5 0 0 1-1.3-1.5v-1a11 11 0 0 0-5.2 0v1a1.5 1.5 0 0 1-1.3 1.5l-2.6.4a1.5 1.5 0 0 1-1.7-1.1Z" />
    </Svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 18}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Svg>
  );
}


/**
 * The scribbled arrow that points a margin note at the thing it annotates.
 * Drawn pointing right; flip it with CSS where the note sits on the other side.
 */
export function HandArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={1.4}
      viewBox="0 0 60 24"
    >
      <path d="M2 6c14 10 30 13 54 11" />
      <path d="M46 10c4 3 8 5 10 7-4 1-7 2-10 4" />
    </svg>
  );
}
