import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { EventCreateBody, EventSummaryRow } from "../schemas/dashboard.schema";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/organizer",
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
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
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
const { CreateEventForm } = await import("./CreateEventForm");

const CREATED: EventSummaryRow = {
  id: "e1",
  name: "Founder Night",
  state: "open",
  starts_at: null,
  form_token: "abc123",
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Create-event flow timed out");
    await act(async () => wait(10));
  }
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function nameField(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[name="name"]')!;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function withForm(
  createEvent: (body: EventCreateBody) => Promise<EventSummaryRow>,
  run: (container: HTMLElement) => Promise<void>,
  onCreated: (event: EventSummaryRow) => void = () => {},
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <CreateEventForm client={{ createEvent }} onCreated={onCreated} />,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

test("a name is all it takes — table size comes preset to five", async () => {
  const submitted: EventCreateBody[] = [];
  let created: EventSummaryRow | null = null;
  await withForm(
    async (body) => {
      submitted.push(body);
      return CREATED;
    },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night"));
      await act(async () => buttonNamed(container, "Create event").click());
      await waitFor(() => created !== null);
      expect(submitted).toEqual([
        {
          name: "Founder Night",
          starts_at: null,
          group_size_target: 5,
          ends_at: null,
          timezone: null,
          location: null,
          description: null,
          capacity: null,
        },
      ]);
      expect(created).toEqual(CREATED);
    },
    (event) => { created = event; },
  );
});

test("a blank name never reaches the network", async () => {
  // The backend would reject it too, but making someone wait on a round trip
  // to be told they left the only required field empty is a wasted second.
  let calls = 0;
  await withForm(
    async () => { calls += 1; return CREATED; },
    async (container) => {
      await act(async () => buttonNamed(container, "Create event").click());
      await waitFor(() => container.querySelector('[role="alert"]') !== null);
      expect(calls).toBe(0);
      expect(document.activeElement).toBe(nameField(container));
    },
  );
});

test("an impatient double-click creates one event, not two", async () => {
  // There is no DELETE on events, so a duplicate is permanent.
  let calls = 0;
  await withForm(
    async () => {
      calls += 1;
      await wait(20);
      return CREATED;
    },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night"));
      const submit = buttonNamed(container, "Create event");
      await act(async () => {
        submit.click();
        submit.click();
      });
      await waitFor(() => calls > 0);
      await act(async () => wait(50));
      expect(calls).toBe(1);
    },
  );
});

test("a failed create keeps what was typed", async () => {
  await withForm(
    async () => { throw new Error("network"); },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night"));
      await act(async () => buttonNamed(container, "Create event").click());
      await waitFor(() => container.querySelector('[role="alert"]') !== null);
      expect(nameField(container).value).toBe("Founder Night");
      expect(buttonNamed(container, "Create event").hasAttribute("disabled"))
        .toBe(false);
    },
  );
});

test("a chosen table size replaces the default", async () => {
  const submitted: EventCreateBody[] = [];
  await withForm(
    async (body) => { submitted.push(body); return CREATED; },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night"));
      const six = container.querySelector<HTMLInputElement>(
        'input[name="group_size_target"][value="6"]',
      )!;
      await act(async () => six.click());
      await act(async () => buttonNamed(container, "Create event").click());
      await waitFor(() => submitted.length > 0);
      expect(submitted[0]?.group_size_target).toBe(6);
    },
  );
});

test("a start time is sent as an instant, not as whatever the box said", async () => {
  // The input reports local wall-clock time; the backend stores a datetime.
  // Asserting the round trip rather than a literal keeps this test honest in
  // every timezone CI might run in.
  const submitted: EventCreateBody[] = [];
  await withForm(
    async (body) => { submitted.push(body); return CREATED; },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night"));
      const when = container.querySelector<HTMLInputElement>(
        'input[name="starts_at"]',
      )!;
      await act(async () => setInput(when, "2026-09-01T19:00"));
      await act(async () => buttonNamed(container, "Create event").click());
      await waitFor(() => submitted.length > 0);
      expect(new Date(submitted[0]!.starts_at!).getTime())
        .toBe(new Date("2026-09-01T19:00").getTime());
    },
  );
});
