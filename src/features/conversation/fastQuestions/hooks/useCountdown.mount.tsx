import { afterEach, expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/fast-questions",
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
  SVGElement: dom.window.SVGElement,
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// Fail the suite on any React "not wrapped in act(...)" warning instead of
// letting it pass silently — this mount test exercises a timer effect whose
// interval/listener cleanup is easy to leave unguarded.
const actWarnings: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.map((arg) => String(arg)).join(" ");
  if (message.includes("not wrapped in act")) {
    actWarnings.push(message);
  }
  originalConsoleError(...(args as Parameters<typeof console.error>));
};

// Instrument the timer + listener primitives the hook depends on so cleanup
// can be asserted by exact call count rather than by inspection.
const calls = {
  addListener: 0,
  clearInterval: 0,
  removeListener: 0,
  setInterval: 0,
};

const originalSetInterval = dom.window.setInterval.bind(dom.window);
const originalClearInterval = dom.window.clearInterval.bind(dom.window);
dom.window.setInterval = ((...args: Parameters<typeof originalSetInterval>) => {
  calls.setInterval += 1;
  return originalSetInterval(...args);
}) as typeof dom.window.setInterval;
dom.window.clearInterval = ((...args: Parameters<typeof originalClearInterval>) => {
  calls.clearInterval += 1;
  return originalClearInterval(...args);
}) as typeof dom.window.clearInterval;

const originalAddEventListener = dom.window.document.addEventListener.bind(
  dom.window.document,
);
const originalRemoveEventListener = dom.window.document.removeEventListener.bind(
  dom.window.document,
);
dom.window.document.addEventListener = ((
  ...args: Parameters<typeof originalAddEventListener>
) => {
  if (args[0] === "visibilitychange") calls.addListener += 1;
  return originalAddEventListener(...args);
}) as typeof dom.window.document.addEventListener;
dom.window.document.removeEventListener = ((
  ...args: Parameters<typeof originalRemoveEventListener>
) => {
  if (args[0] === "visibilitychange") calls.removeListener += 1;
  return originalRemoveEventListener(...args);
}) as typeof dom.window.document.removeEventListener;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { useCountdown } = await import("./useCountdown");

function Probe({ timerEndsAt }: { timerEndsAt: string | null }) {
  const remaining = useCountdown(timerEndsAt);
  return <span data-testid="remaining">{remaining}</span>;
}

afterEach(() => {
  const warnings = actWarnings.splice(0, actWarnings.length);
  expect(warnings).toEqual([]);
});

test("registers exactly one interval and visibility listener, and cleans both up on unmount", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(<Probe timerEndsAt="2026-08-08T20:00:30.000Z" />);
    });

    expect(calls.setInterval).toBe(1);
    expect(calls.addListener).toBe(1);
    expect(calls.clearInterval).toBe(0);
    expect(calls.removeListener).toBe(0);

    await act(async () => {
      root.unmount();
    });

    expect(calls.setInterval).toBe(1);
    expect(calls.addListener).toBe(1);
    expect(calls.clearInterval).toBe(1);
    expect(calls.removeListener).toBe(1);
  } finally {
    container.remove();
  }
});

test("re-registers exactly one interval and listener pair when the deadline changes", async () => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  calls.setInterval = 0;
  calls.addListener = 0;
  calls.clearInterval = 0;
  calls.removeListener = 0;

  try {
    await act(async () => {
      root.render(<Probe timerEndsAt="2026-08-08T20:00:30.000Z" />);
    });
    await act(async () => {
      root.render(<Probe timerEndsAt="2026-08-08T20:01:00.000Z" />);
    });

    expect(calls.setInterval).toBe(2);
    expect(calls.addListener).toBe(2);
    expect(calls.clearInterval).toBe(1);
    expect(calls.removeListener).toBe(1);

    await act(async () => {
      root.unmount();
    });

    expect(calls.setInterval).toBe(2);
    expect(calls.addListener).toBe(2);
    expect(calls.clearInterval).toBe(2);
    expect(calls.removeListener).toBe(2);
  } finally {
    container.remove();
  }
});
