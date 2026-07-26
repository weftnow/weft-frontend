import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Page, { metadata } from "./page";
import { content } from "@/content";

// renderToStaticMarkup HTML-escapes apostrophes ("'" -> "&#x27;"), and several
// inviteError headlines contain one ("We can't find that invitation."). This
// mirrors that escaping so the assertions below compare like with like instead
// of failing to match (or worse, passing by accident on a substring that
// happens not to contain an apostrophe).
const escaped = (text: string) => text.replace(/'/g, "&#x27;");

test("an unreachable backend explains itself instead of crashing", async () => {
  // bun runs the whole suite in one process and other files set this, so the
  // outage being tested has to be arranged explicitly.
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ token: "tok-1" }) }),
  );

  expect(html).toContain(
    escaped(content.compatibilityTest.inviteError.unavailable.headline),
  );
  expect(html).toContain("ctest-shell");
  // Nothing to answer, so no quiz.
  expect(html).not.toContain("ctest-option");
  // An outage is temporary and the link is still good: no way out is offered.
  expect(html).not.toContain(content.compatibilityTest.inviteError.cta);
});

test("an empty token is a not-found without asking the backend", async () => {
  delete process.env.WEFT_API_URL;

  const html = renderToStaticMarkup(
    await Page({ params: Promise.resolve({ token: "" }) }),
  );

  expect(html).toContain(
    escaped(content.compatibilityTest.inviteError.unknown.headline),
  );
  // Unlike the outage case, the link really is dead, so a way out is offered.
  expect(html).toContain(content.compatibilityTest.inviteError.cta);
});

test("an invite is never indexed", () => {
  // The URL is a capability. A crawler holding one would hand it to everyone.
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
