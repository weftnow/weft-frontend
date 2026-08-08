import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  completeQuestionnaire,
  createMemoryQuestionnaireStorage,
  getQuestionnaire,
  submitAnswer,
  type QuestionnaireApi,
  type QuestionnaireStorage,
} from "../api/questionnaire.api";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/questionnaire",
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
Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value() {},
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
const { Questionnaire } = await import("./Questionnaire");

const TEST_TIMINGS = { conversationalPauseMs: 0, transitionDelayMs: 220 };

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  condition: () => boolean,
  debugContainer?: HTMLElement,
) {
  const deadline = Date.now() + 3_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      const phase = debugContainer
        ?.querySelector("[data-questionnaire-phase]")
        ?.getAttribute("data-questionnaire-phase");
      throw new Error(
        `Questionnaire timed out (phase=${phase ?? "missing"}, text=${debugContainer?.textContent ?? "none"})`,
      );
    }
    await act(async () => wait(10));
  }
}

function apiFor(
  storage: QuestionnaireStorage,
  submitOverride?: QuestionnaireApi["submitAnswer"],
): QuestionnaireApi {
  return {
    getQuestionnaire: () => getQuestionnaire(storage),
    submitAnswer:
      submitOverride ?? ((input) => submitAnswer(input, storage)),
    completeQuestionnaire: () => completeQuestionnaire(storage),
  };
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name ||
      candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

async function mountQuestionnaire(
  storage: QuestionnaireStorage,
  api = apiFor(storage),
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(<Questionnaire api={api} timings={TEST_TIMINGS} />);
  });
  await waitFor(
    () => container.querySelector("[data-questionnaire-phase]") !== null,
  );
  return { container, root };
}

async function unmount(root: Root, container: HTMLDivElement) {
  await act(async () => root.unmount());
  container.remove();
}

async function answerText(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="text"]');
  if (!input) throw new Error("Text input not found");
  act(() => typeInto(input, value));
  act(() => buttonNamed(container, "Send answer").click());
}

test("every answer advances and the exact completion messages persist", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const { container, root } = await mountQuestionnaire(storage);
  try {
    await waitFor(() => container.querySelector('[role="radiogroup"]') !== null);
    act(() => buttonNamed(container, "Meet thoughtful new people").click());

    await waitFor(
      () => container.textContent?.includes("Founders and operators") === true,
      container,
    );
    act(() => buttonNamed(container, "Founders and operators").click());

    await waitFor(() => container.querySelector('input[type="text"]') !== null);
    await answerText(container, "Building a climate hiring platform");

    await waitFor(() => container.querySelector('[role="checkbox"]') !== null);
    act(() => buttonNamed(container, "Leadership").click());
    act(() => buttonNamed(container, "Product").click());
    act(() => buttonNamed(container, "Continue").click());

    await waitFor(() => container.querySelector('input[type="text"]') !== null);
    await answerText(container, "Warm introductions to product leaders");

    await waitFor(
      () => container.textContent?.includes("You’re all set.") === true,
    );
    expect(container.textContent).toContain(
      "Thanks. We’ll use your answers to introduce you to the right people.",
    );
    expect((await getQuestionnaire(storage)).session.completed).toBe(true);
  } finally {
    await unmount(root, container);
  }
});

test("submission failure preserves the composer and appends no answer", async () => {
  const storage = createMemoryQuestionnaireStorage();
  let fail = true;
  const api = apiFor(storage, async (input) => {
    if (fail) {
      fail = false;
      throw new Error("Connection lost");
    }
    return submitAnswer(input, storage);
  });
  const { container, root } = await mountQuestionnaire(storage, api);
  try {
    await waitFor(() => container.querySelector('[role="radiogroup"]') !== null);
    act(() => buttonNamed(container, "Meet thoughtful new people").click());
    await waitFor(
      () =>
        container.textContent?.includes("Couldn’t save that answer") === true,
    );

    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(container.querySelectorAll('[aria-label="Your answer"]')).toHaveLength(0);
  } finally {
    await unmount(root, container);
  }
});

test("remount resumes at the current question without replaying old messages", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const firstMount = await mountQuestionnaire(storage);
  await waitFor(
    () => firstMount.container.querySelector('[role="radiogroup"]') !== null,
  );
  act(() =>
    buttonNamed(firstMount.container, "Meet thoughtful new people").click(),
  );
  await waitFor(
    () => firstMount.container.textContent?.includes("Founders and operators") === true,
  );
  await unmount(firstMount.root, firstMount.container);

  const resumed = await mountQuestionnaire(storage);
  try {
    await waitFor(
      () => resumed.container.textContent?.includes("Founders and operators") === true,
    );
    expect(resumed.container.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(
      resumed.container.querySelector("[data-animated-item-id]"),
    ).toBeNull();
  } finally {
    await unmount(resumed.root, resumed.container);
  }
});
