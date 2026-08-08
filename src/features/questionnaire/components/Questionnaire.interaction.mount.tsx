import { expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";

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
const { Questionnaire } = await import("./Questionnaire");
const { createMemoryQuestionnaireStorage, readDraft } = await import(
  "../persistence/questionnaire.storage"
);
const { mapQuestionnaireDefinition } = await import("../model/questionnaire.mapper");
const { formDefinitionSchema } = await import("../schemas/questionnaire.contract.schema");
const { backendFormEn } = await import("../test/backendFormFixtures");
const { testFlowQuestionnaire } = await import("../test/testFlowQuestionnaire");

const FORM_TOKEN = "token-valid-123456";
const TEST_TIMINGS = { conversationalPauseMs: 0, transitionDelayMs: 20 };

const questionnaireEn = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEn));

const COMPLETE_ANSWERS: Record<string, unknown> = {
  name: "Ana",
  email: null,
  phone: "+57 300 000 0000",
  company: "Weft",
  t1: "Raise a seed round for my fintech",
  t2: "An angel who knows LatAm fintech",
  s1_situation: "own_business",
  s1_function: "engineering_product",
  s2: 3,
  s3: "up",
  s4: ["raise_capital"],
  s5: ["experience"],
  s6: 2,
  s7: 2,
  s8: 1,
  s9: 3,
  s10: 3,
};

type QuestionnaireStorage = ReturnType<typeof createMemoryQuestionnaireStorage>;

function clientFor() {
  return {
    async loadLanguage() {
      return questionnaireEn;
    },
    async submit() {
      // Resolves successfully; failure/correction flows belong to Task 9.
    },
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean, debugContainer?: HTMLElement) {
  const deadline = Date.now() + 5_000;
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

function typeInto(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value",
  )?.set;
  setter?.call(field, value);
  field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name || candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

async function mountQuestionnaire(
  storage: QuestionnaireStorage,
  questionnaire = testFlowQuestionnaire,
  client = clientFor(),
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <Questionnaire
        client={client}
        formToken={FORM_TOKEN}
        initialQuestionnaire={questionnaire}
        storage={storage}
        timings={TEST_TIMINGS}
      />,
    );
  });
  await waitFor(() => container.querySelector("button") !== null);
  return { container, root };
}

async function unmount(root: Root, container: HTMLDivElement) {
  await act(async () => root.unmount());
  container.remove();
}

async function startFromOpening(container: HTMLElement) {
  await waitFor(() => container.textContent?.includes("Start") === true);
  act(() => buttonNamed(container, "Start").click());
  await waitFor(() => container.querySelector("[data-questionnaire-phase]") !== null);
}

async function answerCurrentQuestion(
  container: HTMLElement,
  question: (typeof questionnaireEn.questions)[number],
  value: unknown,
) {
  if (question.type === "text") {
    if (value === null) {
      await waitFor(() => container.textContent?.includes("Skip") === true, container);
      act(() => buttonNamed(container, "Skip").click());
      return;
    }
    const field = question.multiline
      ? container.querySelector<HTMLTextAreaElement>("textarea")
      : container.querySelector<HTMLInputElement>("input:not([type=hidden])");
    if (!field) throw new Error(`Answer field not found for ${question.id}`);
    act(() => typeInto(field, String(value)));
    act(() => buttonNamed(container, "Send answer").click());
    return;
  }

  if (question.type === "single_choice") {
    const option = question.options.find((candidate) => candidate.value === value);
    if (!option) throw new Error(`Option not found for ${question.id}=${String(value)}`);
    act(() => buttonNamed(container, option.label).click());
    return;
  }

  const values = value as unknown[];
  for (const selected of values) {
    const option = question.options.find((candidate) => candidate.value === selected);
    if (!option) throw new Error(`Option not found for ${question.id}=${String(selected)}`);
    act(() => buttonNamed(container, option.label).click());
  }
  await waitFor(() => container.textContent?.includes("Continue") === true, container);
  act(() => buttonNamed(container, "Continue").click());
}

test("every backend answer advances and the exact completion messages persist", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const { container, root } = await mountQuestionnaire(storage, questionnaireEn);
  try {
    await startFromOpening(container);

    for (const question of questionnaireEn.questions) {
      await waitFor(
        () => container.textContent?.includes(question.message) === true,
        container,
      );
      await answerCurrentQuestion(container, question, COMPLETE_ANSWERS[question.id]);
    }

    await waitFor(
      () => container.textContent?.includes("You’re all set.") === true,
      container,
    );
    expect(container.textContent).toContain(
      "Thanks. We’ll use your answers to introduce you to the right people.",
    );
    expect(readDraft(FORM_TOKEN, storage)?.status).toBe("completed");
  } finally {
    await unmount(root, container);
  }
});

test("remount resumes at the current question without replaying old messages", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const firstMount = await mountQuestionnaire(storage);
  await startFromOpening(firstMount.container);
  await waitFor(() => firstMount.container.querySelector('[role="radiogroup"]') !== null);
  act(() => buttonNamed(firstMount.container, "Meet thoughtful new people").click());
  await waitFor(() => firstMount.container.querySelector('input[type="text"]') !== null);
  await unmount(firstMount.root, firstMount.container);

  const resumed = await mountQuestionnaire(storage);
  try {
    await waitFor(() => resumed.container.querySelector('input[type="text"]') !== null);
    expect(resumed.container.textContent).toContain("Meet thoughtful new people");
    expect(resumed.container.querySelector("[data-animated-item-id]")).toBeNull();
  } finally {
    await unmount(resumed.root, resumed.container);
  }
});
