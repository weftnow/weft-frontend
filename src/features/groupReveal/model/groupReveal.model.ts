export function initialsFor(name: string): string {
  const parts = name.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts.length ? `${parts[0][0]}${parts.length > 1 ? parts.at(-1)![0] : ""}`.toUpperCase() : "?";
}

export function avatarToneFor(name: string): number {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)!) | 0;
  return Math.abs(hash) % 6;
}

/**
 * The hex behind a backend colour slug.
 *
 * The backend deliberately stores slugs and leaves presentation to us
 * (app/services/palette.py), so this map is the client half of that contract:
 * retune a hue here and every past event redraws, no migration. Twelve slugs,
 * tuned to stay apart from each other on a cheap phone screen held at arm's
 * length in a dim room.
 *
 * An unknown slug falls back to ember rather than throwing — a future
 * thirteenth colour must not blank out someone's table.
 */
const GROUP_COLOURS: Record<string, string> = {
  amber: "#C77800",
  teal: "#0F8375",
  coral: "#E2553C",
  indigo: "#4B4DC4",
  lime: "#5E8B12",
  magenta: "#B62C87",
  cyan: "#0089B3",
  rust: "#B04A16",
  violet: "#7C4DD6",
  olive: "#78791F",
  rose: "#CE3A67",
  slate: "#5A6A7C",
};

export function groupColourFor(slug: string): string {
  return GROUP_COLOURS[slug.toLowerCase()] ?? "#F4511E";
}

export function countdownRemainingMs(revealAt: string, serverTime: string, receivedAtMs: number, nowMs: number): number {
  return Math.max(0, Date.parse(revealAt) - (Date.parse(serverTime) + nowMs - receivedAtMs));
}
