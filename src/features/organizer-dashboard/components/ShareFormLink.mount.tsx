import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "https://weft.example.test/organizer/events/e1/overview",
});
Object.defineProperty(dom.window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener() {},
    dispatchEvent: () => false,
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    removeEventListener() {},
  }),
});

const copied: string[] = [];
let clipboardFails = false;
Object.defineProperty(dom.window.navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (text: string) => {
      if (clipboardFails) throw new Error("denied");
      copied.push(text);
    },
  },
});

Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  Node: dom.window.Node,
  SVGElement: dom.window.SVGElement,
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ShareFormLink } = await import("./ShareFormLink");

const SHARE_URL = "https://weft.example.test/questionnaire/abc123";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Share link timed out");
    await act(async () => wait(10));
  }
}

async function withShareLink(run: (container: HTMLElement) => Promise<void>) {
  copied.length = 0;
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(<ShareFormLink formToken="abc123" />);
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("shows the guest questionnaire URL, not the organizer's own page", async () => {
  await withShareLink(async (container) => {
    expect(container.textContent).toContain(SHARE_URL);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(SHARE_URL);
  });
});

test("copying puts the full absolute URL on the clipboard", async () => {
  // A relative /questionnaire/abc123 pasted into WhatsApp is a dead link.
  await withShareLink(async (container) => {
    const copy = Array.from(container.querySelectorAll("button"))[0]!;
    await act(async () => copy.click());
    await waitFor(() => copied.length > 0);
    expect(copied[0]).toBe(SHARE_URL);
  });
});

test("copying says so, so the organizer knows it worked", async () => {
  await withShareLink(async (container) => {
    const copy = Array.from(container.querySelectorAll("button"))[0]!;
    await act(async () => copy.click());
    await waitFor(() => container.textContent?.includes("Copied") === true);
  });
});

test("a blocked clipboard leaves the URL on screen to copy by hand", async () => {
  // Clipboard access is denied outside secure contexts and by some browsers.
  // The URL is rendered as text precisely so that failure is survivable.
  clipboardFails = true;
  try {
    await withShareLink(async (container) => {
      const copy = Array.from(container.querySelectorAll("button"))[0]!;
      await act(async () => copy.click());
      await act(async () => wait(30));
      expect(container.textContent).toContain(SHARE_URL);
      expect(container.textContent).not.toContain("Copied");
    });
  } finally {
    clipboardFails = false;
  }
});
