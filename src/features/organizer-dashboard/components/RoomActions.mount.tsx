import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "https://weft.example.test/organizer/events/e1/live",
});

const posted: string[] = [];
let requestFails = false;

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

// The whole point of these tests is which clicks reach the network, so the
// fetch is recorded rather than mocked away silently.
globalThis.fetch = (async (input: string) => {
  posted.push(String(input));
  if (requestFails) return new Response("nope", { status: 503 });
  return new Response(JSON.stringify({ status: "locked" }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { LockRoomCard } = await import("./LockRoomCard");
const { RevealTablesCard } = await import("./RevealTablesCard");

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean, what: string) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${what}`);
    await act(async () => wait(10));
  }
}

function buttonNamed(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(label),
  );
}

async function withCard(
  submitted: number,
  run: (container: HTMLElement) => Promise<void>,
) {
  posted.length = 0;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <LockRoomCard eventId="e1" submitted={submitted} />
      </QueryClientProvider>,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("an empty room cannot be seated at all", async () => {
  // /lock has no minimum-response check of its own: it transitions the event
  // and queues the partition regardless, so locking an empty room is a
  // one-way trip to an event with no tables.
  await withCard(0, async (container) => {
    const button = buttonNamed(container, "Form groups now")!;
    expect(button.hasAttribute("disabled")).toBe(true);
    await act(async () => button.click());
    await act(async () => wait(30));
    expect(posted).toEqual([]);
  });
});

test("the reason an empty room is blocked is on screen, not only in the dimming", async () => {
  await withCard(0, async (container) => {
    expect(container.textContent).toContain("Nobody has answered the form yet");
  });
});

test("the first click asks rather than locks", async () => {
  await withCard(12, async (container) => {
    const button = buttonNamed(container, "Form groups now")!;
    expect(button.hasAttribute("disabled")).toBe(false);
    await act(async () => button.click());
    await act(async () => wait(30));

    expect(posted).toEqual([]);
    // The count is the thing being confirmed, so it has to be in the question.
    expect(container.textContent).toContain("seats the 12 guests");
    expect(buttonNamed(container, "Yes, form groups")).toBeDefined();
  });
});

test("confirming is what sends the lock", async () => {
  await withCard(12, async (container) => {
    await act(async () => buttonNamed(container, "Form groups now")!.click());
    await act(async () => buttonNamed(container, "Yes, form groups")!.click());
    await waitFor(() => posted.length > 0, "the lock request");
    expect(posted[0]).toBe("/api/organizer/events/e1/lock");
  });
});

test("cancelling backs out and sends nothing", async () => {
  await withCard(12, async (container) => {
    await act(async () => buttonNamed(container, "Form groups now")!.click());
    await act(async () => buttonNamed(container, "Cancel")!.click());
    await act(async () => wait(30));

    expect(posted).toEqual([]);
    expect(buttonNamed(container, "Yes, form groups")).toBeUndefined();
    expect(buttonNamed(container, "Form groups now")).toBeDefined();
  });
});

test("a locked room stops offering to lock again", async () => {
  // The backend answers 202: the partition is queued, not done. Leaving the
  // button up would suggest the matching can be re-run.
  await withCard(12, async (container) => {
    await act(async () => buttonNamed(container, "Form groups now")!.click());
    await act(async () => buttonNamed(container, "Yes, form groups")!.click());
    await waitFor(
      () => container.textContent?.includes("Seating the room") === true,
      "the seated state",
    );
    expect(buttonNamed(container, "Form groups now")).toBeUndefined();
  });
});

test("a failed lock says nothing changed, and lets you retry", async () => {
  requestFails = true;
  try {
    await withCard(12, async (container) => {
      await act(async () => buttonNamed(container, "Form groups now")!.click());
      await act(async () => buttonNamed(container, "Yes, form groups")!.click());
      await waitFor(
        () => container.textContent?.includes("Nothing has changed") === true,
        "the failure message",
      );
      expect(buttonNamed(container, "Yes, form groups")).toBeDefined();
    });
  } finally {
    requestFails = false;
  }
});

async function withRevealCard(run: (container: HTMLElement) => Promise<void>) {
  posted.length = 0;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <RevealTablesCard eventId="e1" />
      </QueryClientProvider>,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("the first click asks rather than reveals", async () => {
  await withRevealCard(async (container) => {
    await act(async () => buttonNamed(container, "Reveal the tables")!.click());
    await act(async () => wait(30));

    expect(posted).toEqual([]);
    expect(container.textContent).toContain("cannot be undone");
    expect(buttonNamed(container, "Yes, reveal")).toBeDefined();
  });
});

test("confirming is what sends the reveal", async () => {
  await withRevealCard(async (container) => {
    await act(async () => buttonNamed(container, "Reveal the tables")!.click());
    await act(async () => buttonNamed(container, "Yes, reveal")!.click());
    await waitFor(() => posted.length > 0, "the reveal request");
    expect(posted[0]).toBe("/api/organizer/events/e1/reveal");
  });
});

test("a revealed room stops offering to reveal", async () => {
  // There is no un-reveal. A button still standing there would imply one.
  await withRevealCard(async (container) => {
    await act(async () => buttonNamed(container, "Reveal the tables")!.click());
    await act(async () => buttonNamed(container, "Yes, reveal")!.click());
    await waitFor(
      () => container.textContent?.includes("The tables are out") === true,
      "the revealed state",
    );
    expect(buttonNamed(container, "Reveal the tables")).toBeUndefined();
  });
});

test("a failed reveal says nothing changed, and lets you retry", async () => {
  requestFails = true;
  try {
    await withRevealCard(async (container) => {
      await act(async () => buttonNamed(container, "Reveal the tables")!.click());
      await act(async () => buttonNamed(container, "Yes, reveal")!.click());
      await waitFor(
        () => container.textContent?.includes("Nothing has changed") === true,
        "the failure message",
      );
      expect(buttonNamed(container, "Yes, reveal")).toBeDefined();
    });
  } finally {
    requestFails = false;
  }
});
