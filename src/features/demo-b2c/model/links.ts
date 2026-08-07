/**
 * The frontend owns the shape of every shareable URL -- the backend's
 * placeholder share URL is ignored. Tokens and ids are opaque data from the
 * wire, so they are encoded on the way into a path rather than trusted as URL
 * syntax.
 */

const INVITE_BASE = "/match/invite";
const PAIR_BASE = "/match/pair";
const THREAD_BASE = "/match/thread";

export function inviteHref(token: string): string {
  return `${INVITE_BASE}/${encodeURIComponent(token)}`;
}

/**
 * Where a responder lands. Their own share token rides along in the query so
 * they can invite someone onward without re-taking the quiz -- a capability
 * meant to be handed out, in the one place a page navigation preserves.
 */
export function pairHref(pairId: string, shareToken?: string | null): string {
  const path = `${PAIR_BASE}/${encodeURIComponent(pairId)}`;
  if (!shareToken) return path;
  return `${path}?share=${encodeURIComponent(shareToken)}`;
}

/**
 * Where the sender comes back to. Scoped to one invite, so it shows what that
 * invitation produced rather than every match they belong to -- and it is a
 * different secret from the invite token, so forwarding the invite does not
 * hand this over.
 */
export function threadHref(returnToken: string): string {
  return `${THREAD_BASE}/${encodeURIComponent(returnToken)}`;
}

/**
 * Next hands a query value over as `string | string[] | undefined` -- repeated
 * keys arrive as an array. An empty value is the same as none.
 */
export function readShareParam(
  value: string | string[] | undefined,
): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first !== "" ? first : null;
}
