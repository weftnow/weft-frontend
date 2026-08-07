import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./Conversation.tsx", import.meta.url), "utf8");

test("follows the active message when composer growth resizes the conversation", () => {
  expect(source).toContain("new ResizeObserver");
  expect(source).toContain("resizeObserver.observe(viewport)");
  expect(source).toContain("followConversation(true)");
  expect(source).toContain('aria-hidden="true" className="h-12"');
});
