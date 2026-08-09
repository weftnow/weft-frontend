import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import EventConversationPage, { metadata } from "./page";

test("renders the private conversation entry for a valid event ID", async () => {
  const html = renderToStaticMarkup(
    await EventConversationPage({
      params: Promise.resolve({
        eventId: "7450326b-00d8-4c3a-8651-16cec6d46d91",
      }),
    }),
  );
  expect(html).toContain("Preparing your conversation");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("renders invalid-link guidance without mounting the experience", async () => {
  const html = renderToStaticMarkup(
    await EventConversationPage({
      params: Promise.resolve({ eventId: "invalid" }),
    }),
  );
  expect(html).toContain("This event link isn");
  expect(html).not.toContain("Preparing your conversation");
});
