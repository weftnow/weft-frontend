/**
 * The organizer's send button.
 *
 * No API and no automation: wa.me opens WhatsApp on that person's chat with
 * the message already written, and a human presses send. That is the whole
 * delivery mechanism this product has, and it needs no business account, no
 * approved template and no per-message fee.
 */

export function attendeeLinkUrl(origin: string, linkToken: string): string {
  return `${origin.replace(/\/+$/, "")}/l/${encodeURIComponent(linkToken)}`;
}

/**
 * wa.me takes digits only — no plus, no spaces, no leading zero.
 *
 * A number that is not already international is refused rather than guessed
 * at: a local `0123…` belongs to a different person in every country, and a
 * link sent to the wrong number is worse than a link not sent.
 */
export function waMeUrl(phone: string | null, linkUrl: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[\s()-]/g, "");
  if (!/^\+\d{7,15}$/.test(digits)) return null;
  const text = encodeURIComponent(`Here's your Weft link — open it to see your table: ${linkUrl}`);
  return `https://wa.me/${digits.slice(1)}?text=${text}`;
}
