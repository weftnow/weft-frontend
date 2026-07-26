import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";
import { content } from "@/content";

// renderToStaticMarkup HTML-escapes apostrophes ("'" -> "&#x27;"), and both
// pair error headlines contain one ("We couldn't reach the service.",
// "We can't find that result."). This mirrors that escaping so the assertions
// below compare like with like instead of failing to match.
const escaped = (text: string) => text.replace(/'/g, "&#x27;");

// Annotated rather than inferred: `Promise<{}>` only satisfies the page's
// parameter type by way of an implicit index signature, which is a fragile
// thing to depend on.
const NO_QUERY: Promise<Record<string, string | string[] | undefined>> =
  Promise.resolve({});

test("an unreachable backend explains itself instead of crashing", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ id: "p1" }), searchParams: NO_QUERY }),
  );

  expect(html).toContain(escaped(content.compatibilityTest.pair.unavailable.headline));
  expect(html).toContain("ctest-shell");
});

test("an empty id is a not-found without asking the backend", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ id: "" }), searchParams: NO_QUERY }),
  );

  expect(html).toContain(escaped(content.compatibilityTest.pair.missing.headline));
});

test("a result is never indexed", () => {
  // Both people's profiles sit behind this URL.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("the preview names nobody", () => {
  // A share preview unfurls wherever the link is pasted, so neither field may
  // carry a name. Asserted exactly: a later edit that interpolates one should
  // fail here.
  expect(metadata.title).toBe("Weft: Your compatibility");
  expect(metadata.description).toBe(
    "How two people connect, in words rather than a score.",
  );
});
