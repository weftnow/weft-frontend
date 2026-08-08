import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { questionnaireMessages } from "../i18n/questionnaire.messages";
import type { AnswerValue, Question } from "../types/questionnaire.types";
import { QuestionComposer } from "./QuestionComposer";

const messages = questionnaireMessages.en;

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
        messages={messages}
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

const numericSingleQuestion: Question = {
  id: "s2",
  type: "single_choice",
  message: "How long have you been in this?",
  required: true,
  options: [
    { id: "s2:1", label: "Just starting (under 2 years)", value: 1 },
    { id: "s2:2", label: "2–5 years", value: 2 },
    { id: "s2:3", label: "5–10 years", value: 3 },
    { id: "s2:4", label: "10–15 years", value: 4 },
    { id: "s2:5", label: "15+ years", value: 5 },
  ],
};

const optionalEmailQuestion: Question = {
  id: "email",
  type: "text",
  message: "Email",
  required: false,
  multiline: false,
  inputFormat: "email",
  maxLength: 254,
};

const longTextQuestion: Question = {
  id: "t1",
  type: "text",
  message: "What do you want to accomplish today? Be specific.",
  required: true,
  multiline: true,
  inputFormat: "text",
  maxLength: 1_000,
};

const optionalOffersQuestion: Question = {
  id: "s5",
  type: "multiple_choice",
  message: "So what can you bring?",
  required: false,
  minSelections: 0,
  options: [
    { id: "s5:experience", label: "Experience in my field", value: "experience" },
    { id: "s5:intros", label: "Intros to the right people", value: "intros" },
  ],
};

test("numeric single choice emits the original number", async () => {
  await withComposer(numericSingleQuestion, async (container, submissions) => {
    await act(async () => buttonNamed(container, "5–10 years").click());
    await waitFor(() => submissions.length === 1);
    expect(submissions).toEqual([3]);
  });
});

test("optional short text exposes Skip and email semantics", async () => {
  await withComposer(optionalEmailQuestion, async (container, submissions) => {
    const input = container.querySelector<HTMLInputElement>('input[type="email"]');
    expect(input?.autocomplete).toBe("email");
    expect(input?.maxLength).toBe(254);
    await act(async () => buttonNamed(container, "Skip").click());
    expect(submissions).toEqual([null]);
  });
});

test("long text uses a bounded textarea", async () => {
  await withComposer(longTextQuestion, async (container) => {
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea?.maxLength).toBe(1000);
  });
});

test("optional multi choice may continue with zero selections", async () => {
  await withComposer(optionalOffersQuestion, async (container, submissions) => {
    await act(async () => buttonNamed(container, "Continue").click());
    expect(submissions).toEqual([[]]);
  });
});
