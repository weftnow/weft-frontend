/**
 * `renderToStaticMarkup` escapes apostrophes to `&#x27;`, so a test comparing
 * against copy from content.ts has to escape it the same way.
 *
 * Test-only, and deliberately loud about its limits: React also escapes `&`
 * and `<`, and a helper that silently passed those through would turn a wrong
 * assertion into a passing one. If copy ever needs them, widen this function
 * -- do not widen the input.
 */
export function escapeApostrophes(text: string): string {
  if (/[&<]/.test(text)) {
    throw new Error(
      `escapeApostrophes only handles apostrophes, and this text contains & or <: ${text}`,
    );
  }
  return text.replace(/'/g, "&#x27;");
}
