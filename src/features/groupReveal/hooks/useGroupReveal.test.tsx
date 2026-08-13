import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { GroupRevealProbe } from "./useGroupReveal.mount";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
Object.assign(globalThis, { document: dom.window.document, window: dom.window, navigator: dom.window.navigator });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("moves from polling waiting state into a ready group", async () => {
  const node = document.createElement("div"); const root = createRoot(node);
  await act(async () => root.render(<GroupRevealProbe client={{ load: async () => ({ status: "ready", group: { group_index: 0, colour: "amber", confirmed: false, reveal_at: "2099-01-01T00:00:00+00:00", server_time: "2099-01-01T00:00:00+00:00", tablemates: [] } }), confirm: async () => {} }} />));
  expect(node.textContent).toBe("ready");
  await act(async () => root.unmount());
});
