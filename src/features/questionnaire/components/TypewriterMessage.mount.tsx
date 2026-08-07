import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { TypewriterMessage } from "./TypewriterMessage";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/questionnaire",
});
Object.defineProperty(dom.window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener() {},
    dispatchEvent: () => false,
    matches: false,
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

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Typewriter timed out");
    await act(async () => wait(5));
  }
}

async function withRoot(run: (root: Root, container: HTMLDivElement) => Promise<void>) {
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

test("new Weft text reveals progressively and completes once", async () => {
  await withRoot(async (root, container) => {
    let completions = 0;
    await act(async () => {
      root.render(
        <TypewriterMessage
          animate
          characterDelayMs={8}
          content="Hello."
          onComplete={() => {
            completions += 1;
          }}
        />,
      );
    });

    expect(container.textContent === "Hello.").toBe(false);
    await waitFor(
      () =>
        container.textContent?.includes("Hello.") === true && completions === 1,
    );
    expect(completions).toBe(1);
  });
});

test("old text renders immediately without replaying completion", async () => {
  await withRoot(async (root, container) => {
    let completions = 0;
    await act(async () => {
      root.render(
        <TypewriterMessage
          animate={false}
          content="Already here"
          onComplete={() => {
            completions += 1;
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Already here");
    expect(completions).toBe(0);
  });
});

test("unmount clears pending character timers", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root = createRoot(container);
  let completions = 0;
  await act(async () => {
    root.render(
      <TypewriterMessage
        animate
        characterDelayMs={25}
        content="A longer message"
        onComplete={() => {
          completions += 1;
        }}
      />,
    );
  });
  await act(async () => root.unmount());
  await act(async () => wait(60));

  expect(completions).toBe(0);
  container.remove();
});
