import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

async function withRoot(
  reducedMotion: boolean,
  run: (root: Root, container: HTMLDivElement) => Promise<void>,
) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost/organizer-auth",
  });
  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener() {},
      dispatchEvent: () => false,
      matches: reducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener() {},
    }),
  });
  Object.assign(globalThis, {
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    document: dom.window.document,
    navigator: dom.window.navigator,
    window: dom.window,
  });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;

  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  // motion-dom caches its prefers-reduced-motion check in a module-level
  // singleton the first time useReducedMotion() runs, so it never re-reads
  // matchMedia again in this process. Reset the singleton before each render
  // so every fresh JSDOM window's matchMedia mock is actually consulted.
  const { hasReducedMotionListener } = await import("motion-dom");
  hasReducedMotionListener.current = false;

  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root = createRoot(container);
  try {
    await run(root, container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("prompt characters receive progressive Motion markup", async () => {
  await withRoot(false, async (root, container) => {
    const { act } = await import("react");
    const { AnimatedPrompt } = await import("./AnimatedPrompt");
    await act(async () => root.render(<AnimatedPrompt text="Welcome back." />));
    expect(container.querySelectorAll('[data-auth-character="true"]')).toHaveLength(12);
    expect(container.textContent).toContain("Welcome back.");
  });
});

test("reduced motion renders the complete prompt immediately", async () => {
  await withRoot(true, async (root, container) => {
    const { act } = await import("react");
    const { AnimatedPrompt } = await import("./AnimatedPrompt");
    await act(async () => root.render(<AnimatedPrompt text="Create a password." />));
    expect(container.textContent).toContain("Create a password.");
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeDefined();
  });
});
