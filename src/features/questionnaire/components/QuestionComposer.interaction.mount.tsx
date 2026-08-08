import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { AnswerValue, Question } from "../types/questionnaire.types";
import { QuestionComposer } from "./QuestionComposer";

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
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  Node: dom.window.Node,
  SVGElement: dom.window.SVGElement,
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");

const options = [
  { id: "leadership", label: "Leadership", value: "leadership" },
  { id: "ai", label: "AI & technology", value: "ai-tech" },
  { id: "product", label: "Product", value: "product" },
  { id: "design", label: "Design", value: "design" },
  { id: "marketing", label: "Marketing", value: "marketing" },
];

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Composer timed out");
    await act(async () => wait(10));
  }
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

async function withComposer(
  question: Question,
  run: (
    container: HTMLDivElement,
    submissions: AnswerValue[],
  ) => Promise<void>,
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  const submissions: AnswerValue[] = [];
  await act(async () => {
    root.render(
      <QuestionComposer
        disabled={false}
        error={null}
        onSubmit={(value) => {
          submissions.push(value);
        }}
        question={question}
      />,
    );
  });
  try {
    await run(container, submissions);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

test("text Enter trims and submits once", async () => {
  await withComposer(
    {
      id: "work",
      type: "text",
      message: "What are you building?",
      required: true,
      multiline: false,
      inputFormat: "text",
      maxLength: 200,
    },
    async (container, submissions) => {
      const input = container.querySelector<HTMLInputElement>('input[type="text"]');
      if (!input) throw new Error("Text input not found");
      await act(async () => {
        typeInto(input, "  Building a climate hiring platform  ");
      });
      await act(async () => {
        input.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
          }),
        );
      });
      await waitFor(() => submissions.length === 1);
      expect(submissions).toEqual(["Building a climate hiring platform"]);
    },
  );
});

test("single choice confirms briefly then submits exactly one value", async () => {
  await withComposer(
    {
      id: "reason",
      type: "single_choice",
      message: "Why are you here?",
      options,
    },
    async (container, submissions) => {
      const choice = buttonNamed(container, "Leadership");
      await act(async () => choice.click());
      expect(choice.getAttribute("aria-checked")).toBe("true");
      await waitFor(() => submissions.length === 1);
      expect(submissions).toEqual(["leadership"]);
    },
  );
});

test("multiple choice enforces bounds and reveals Continue at minimum", async () => {
  await withComposer(
    {
      id: "topics",
      type: "multiple_choice",
      message: "What topics matter?",
      options,
      minSelections: 2,
      maxSelections: 4,
    },
    async (container, submissions) => {
      expect(container.textContent?.includes("Continue")).toBe(false);
      await act(async () => buttonNamed(container, "Leadership").click());
      await act(async () => buttonNamed(container, "AI & technology").click());
      expect(container.textContent).toContain("Continue");
      await act(async () => buttonNamed(container, "Product").click());
      await act(async () => buttonNamed(container, "Design").click());
      expect(buttonNamed(container, "Marketing").disabled).toBe(true);
      await act(async () => buttonNamed(container, "Marketing").click());
      expect(
        container.querySelectorAll('[role="checkbox"][aria-checked="true"]'),
      ).toHaveLength(4);
      await act(async () => buttonNamed(container, "Continue").click());
      expect(submissions[0]).toEqual([
        "leadership",
        "ai-tech",
        "product",
        "design",
      ]);
    },
  );
});

test("hybrid Other reveals a required inline input", async () => {
  await withComposer(
    {
      id: "people",
      type: "hybrid",
      message: "Who should you meet?",
      options: options.slice(0, 3),
      allowOther: true,
    },
    async (container, submissions) => {
      await act(async () => buttonNamed(container, "Other").click());
      const input = container.querySelector<HTMLInputElement>(
        'input[aria-label="Tell us who you would like to meet"]',
      );
      if (!input) throw new Error("Other input not found");
      const submit = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Send other answer"]',
      );
      expect(submit?.disabled).toBe(true);
      await act(async () => {
        typeInto(input, "  People working on public-interest AI  ");
      });
      await act(async () => submit?.click());
      expect(submissions).toEqual(["People working on public-interest AI"]);
    },
  );
});
