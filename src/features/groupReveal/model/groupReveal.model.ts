export function initialsFor(name: string): string {
  const parts = name.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts.length ? `${parts[0][0]}${parts.length > 1 ? parts.at(-1)![0] : ""}`.toUpperCase() : "?";
}

export function avatarToneFor(name: string): number {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)!) | 0;
  return Math.abs(hash) % 6;
}

export function countdownRemainingMs(revealAt: string, serverTime: string, receivedAtMs: number, nowMs: number): number {
  return Math.max(0, Date.parse(revealAt) - (Date.parse(serverTime) + nowMs - receivedAtMs));
}
