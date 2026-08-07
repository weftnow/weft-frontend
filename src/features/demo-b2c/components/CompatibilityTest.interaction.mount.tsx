import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { toQuizQuestions } from "@/features/demo-b2c/schemas/compatibilityQuestions";
import type { BankQuestion } from "@/features/demo-b2c/types/contracts";

const BANK: BankQuestion[] = [
  {
    id: "Q1",
    prompt: "Pick one",
    kind: "single",
    seg: 1,
    options: ["First", "Second"],
  },
  {
    id: "Q2",
    prompt: "Pick two",
    kind: "pick2",
    seg: 2,
    options: ["Alpha", "Beta", "Gamma"],
  },
];

const QUESTIONS = toQuizQuestions(BANK);
const CANCEL_WAIT_MS = 250;
const CONDITION_TIMEOUT_MS = 2000;

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/compatibility-test",
});
let container: HTMLDivElement;
let root: Root;

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

function buttonNamed(name: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"]`,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

function controls(role: "checkbox" | "radio"): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(`button[role="${role}"]`),
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + CONDITION_TIMEOUT_MS;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for questionnaire state");
    }
    await act(async () => wait(10));
  }
}

async function openQuiz() {
  const { CompatibilityTest } = await import("./CompatibilityTest");
  await act(async () => {
    root.render(<CompatibilityTest questions={QUESTIONS} />);
  });
  await act(async () => {
    buttonNamed(demoB2cContent.intro.cta).click();
  });
  await waitFor(() => controls("radio").length > 0);
}

async function withQuestionnaire(run: () => Promise<void>) {
  container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  root = createRoot(container);
  try {
    await openQuiz();
    await run();
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
}

test("single-choice auto-advance updates one continuous progress bar", async () => {
  await withQuestionnaire(async () => {
    const before = container.querySelector<HTMLElement>('[role="progressbar"]');
    const fill = container.querySelector<HTMLElement>(
      ".ctest-progressbar-fill",
    );
    expect(before?.getAttribute("aria-valuenow")).toBe("1");
    expect(fill?.style.width).toBe("50%");

    await act(async () => {
      controls("radio")[0].click();
    });
    await waitFor(
      () =>
        container
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow") === "2",
    );

    const progressbars = container.querySelectorAll('[role="progressbar"]');
    expect(progressbars).toHaveLength(1);
    expect(progressbars[0]).toBe(before);
    expect(progressbars[0].getAttribute("aria-valuenow")).toBe("2");
    expect(
      container.querySelector<HTMLElement>(".ctest-progressbar-fill")?.style
        .width,
    ).toBe("100%");
  });
});

test("deselecting a single choice cancels its pending auto-advance", async () => {
  await withQuestionnaire(async () => {
    await act(async () => {
      controls("radio")[0].click();
    });
    await act(async () => {
      controls("radio")[0].click();
    });
    await act(async () => wait(CANCEL_WAIT_MS));

    expect(
      container
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("1");
    expect(controls("radio")[0].getAttribute("aria-checked")).toBe("false");
  });
});

test("multi-choice gates Next, orders Back first, and preserves prior answers", async () => {
  await withQuestionnaire(async () => {
    await act(async () => {
      controls("radio")[0].click();
    });
    await waitFor(
      () =>
        container
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow") === "2",
    );
    await waitFor(() => controls("checkbox").length > 0);

    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(true);

    await act(async () => controls("checkbox")[0].click());
    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(true);

    await act(async () => controls("checkbox")[1].click());
    expect(buttonNamed(demoB2cContent.quiz.next).disabled).toBe(false);

    const footer = container.querySelector(".ctest-quiz-footer");
    const actions = footer?.querySelectorAll("button");
    expect(actions).toHaveLength(2);
    expect(actions?.[0].textContent).toContain(
      demoB2cContent.quiz.back,
    );
    expect(actions?.[1].getAttribute("aria-label")).toBe(
      demoB2cContent.quiz.next,
    );

    await act(async () => {
      actions?.[0].click();
    });
    await waitFor(() => controls("radio").length > 0);
    expect(controls("radio")[0].getAttribute("aria-checked")).toBe("true");
  });
});
