/** Long enough for a real name, short enough to leave the headline readable. */
const MAX_NAME_LENGTH = 32;

/**
 * The sender's name is whatever they typed into a form, and it goes straight
 * into a headline. React escapes it, so there is nothing to sanitise for
 * safety -- this is about shape: tidy the whitespace, cap the length, and
 * never address an empty string.
 */
export function displayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name === "") return "Someone";
  if (name.length <= MAX_NAME_LENGTH) return name;
  return `${name.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

/** Drops the tidied name into every `{name}` slot in a copy string. */
export function withName(template: string, raw: string): string {
  return template.replaceAll("{name}", displayName(raw));
}
