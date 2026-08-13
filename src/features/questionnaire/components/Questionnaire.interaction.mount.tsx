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
const { backendFormEn, backendFormEs } = await import("../test/backendFormFixtures");
const { testFlowQuestionnaire } = await import("../test/testFlowQuestionnaire");
const { questionnaireMessages } = await import("../i18n/questionnaire.messages");

const FORM_TOKEN = "token-valid-123456";
const TEST_TIMINGS = { conversationalPauseMs: 0, transitionDelayMs: 20 };

const questionnaireEn = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEn));
const questionnaireEs = mapQuestionnaireDefinition(formDefinitionSchema.parse(backendFormEs));

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
type BackendQuestionnaire = typeof questionnaireEn;
type Labels = { skip: string; sendAnswer: string; continueLabel: string; start: string };

function labelsFor(language: "en" | "es"): Labels {
  const messages = questionnaireMessages[language];
  return {
    skip: messages.skip,
    sendAnswer: messages.sendAnswer,
    continueLabel: messages.continue,
    start: messages.start,
  };
}

function clientFor() {
  const loadLanguageCalls: string[] = [];
  const submitCalls: { submissionId: string; body: unknown }[] = [];
  return {
    loadLanguageCalls,
    submitCalls,
    async loadLanguage(_formToken: string, language: "en" | "es") {
      loadLanguageCalls.push(language);
      return language === "es" ? questionnaireEs : questionnaireEn;
    },
    async submit(_formToken: string, submissionId: string, body: unknown) {
      submitCalls.push({ submissionId, body });
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
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
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
  questionnaire: BackendQuestionnaire = testFlowQuestionnaire,
  client = clientFor(),
  onCompleted: (formToken: string) => void = () => {},
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
        onCompleted={onCompleted}
      />,
    );
  });
  await waitFor(() => container.querySelector(".questionnaire-shell") !== null);
  return { container, root, client };
}

async function unmount(root: Root, container: HTMLDivElement) {
  await act(async () => root.unmount());
  container.remove();
}

async function startFromOpening(container: HTMLElement, startLabel: string) {
  await waitFor(() => container.textContent?.includes(startLabel) === true);
  act(() => buttonNamed(container, startLabel).click());
  await waitFor(() => container.querySelector("[data-questionnaire-phase]") !== null);
}

async function answerCurrentQuestion(
  container: HTMLElement,
  question: BackendQuestionnaire["questions"][number],
  value: unknown,
  labels: Labels,
) {
  if (question.type === "text") {
    if (value === null) {
      await waitFor(() => container.textContent?.includes(labels.skip) === true, container);
      act(() => buttonNamed(container, labels.skip).click());
      return;
    }
    const field = question.multiline
      ? container.querySelector<HTMLTextAreaElement>("textarea")
      : container.querySelector<HTMLInputElement>("input:not([type=hidden])");
    if (!field) throw new Error(`Answer field not found for ${question.id}`);
    act(() => typeInto(field, String(value)));
    act(() => buttonNamed(container, labels.sendAnswer).click());
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
  await waitFor(() => container.textContent?.includes(labels.continueLabel) === true, container);
  act(() => buttonNamed(container, labels.continueLabel).click());
}

async function runFullJourney(
  container: HTMLElement,
  questionnaire: BackendQuestionnaire,
  labels: Labels,
) {
  for (const question of questionnaire.questions) {
    await waitFor(() => container.textContent?.includes(question.message) === true, container);
    await answerCurrentQuestion(container, question, COMPLETE_ANSWERS[question.id], labels);
  }
}

test(
  "every backend answer advances and the exact completion messages persist (English)",
  async () => {
    const storage = createMemoryQuestionnaireStorage();
    const client = clientFor();
    const completed: string[] = [];
    const { container, root } = await mountQuestionnaire(storage, questionnaireEn, client, (token) => completed.push(token));
    try {
      const labels = labelsFor("en");
      await startFromOpening(container, labels.start);
      expect(client.loadLanguageCalls).toEqual([]);

      await runFullJourney(container, questionnaireEn, labels);

      await waitFor(
        () => container.textContent?.includes("You’re all set.") === true,
        container,
      );
      expect(container.textContent).toContain(
        "Thanks. We’ll use your answers to introduce you to the right people.",
      );
      expect(readDraft(FORM_TOKEN, storage)?.status).toBe("completed");
      // Exactly one final network write for the whole 17-question journey.
      expect(client.submitCalls).toHaveLength(1);
      expect(completed).toEqual([FORM_TOKEN]);
      expect(client.loadLanguageCalls).toEqual([]);
      // The language picker never reappears once the conversation starts.
      expect(container.querySelector('[role="radiogroup"][aria-label="Language"]')).toBeNull();
    } finally {
      await unmount(root, container);
    }
  },
  15_000,
);

test(
  "every backend answer advances and the exact completion messages persist (Spanish)",
  async () => {
    const storage = createMemoryQuestionnaireStorage();
    const client = clientFor();
    const completed: string[] = [];
    const { container, root } = await mountQuestionnaire(storage, questionnaireEs, client, (token) => completed.push(token));
    try {
      const labels = labelsFor("es");
      await startFromOpening(container, labels.start);
      expect(client.loadLanguageCalls).toEqual([]);

      await runFullJourney(container, questionnaireEs, labels);

      await waitFor(
        () => container.textContent?.includes("Todo listo.") === true,
        container,
      );
      expect(container.textContent).toContain(
        "Gracias. Usaremos tus respuestas para presentarte a las personas indicadas.",
      );
      expect(readDraft(FORM_TOKEN, storage)?.status).toBe("completed");
      expect(client.submitCalls).toHaveLength(1);
      expect(client.loadLanguageCalls).toEqual([]);
      expect(completed).toEqual([FORM_TOKEN]);
    } finally {
      await unmount(root, container);
    }
  },
  15_000,
);

test("remount resumes at the current question without replaying old messages", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const firstMount = await mountQuestionnaire(storage);
  const labels = labelsFor("en");
  await startFromOpening(firstMount.container, labels.start);
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

test("refresh after a numeric choice and a skipped optional answer resumes correctly and never stores the attendee token", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const labels = labelsFor("en");
  const firstMount = await mountQuestionnaire(storage, questionnaireEn, clientFor());
  await startFromOpening(firstMount.container, labels.start);

  // name, then skip the optional email, through to the numeric s2 choice.
  const upToS2 = questionnaireEn.questions.slice(
    0,
    questionnaireEn.questions.findIndex((q) => q.id === "s2") + 1,
  );
  for (const question of upToS2) {
    await waitFor(
      () => firstMount.container.textContent?.includes(question.message) === true,
      firstMount.container,
    );
    await answerCurrentQuestion(
      firstMount.container,
      question,
      COMPLETE_ANSWERS[question.id],
      labels,
    );
  }

  await waitFor(
    () => firstMount.container.textContent?.includes("5–10 years") === true,
    firstMount.container,
  );
  const nextQuestion = questionnaireEn.questions[upToS2.length];
  await waitFor(
    () => firstMount.container.textContent?.includes(nextQuestion.message) === true,
    firstMount.container,
  );

  const draftSoFar = readDraft(FORM_TOKEN, storage);
  expect(draftSoFar?.status).toBe("draft");
  const serializedDraft = JSON.stringify(draftSoFar);
  expect(serializedDraft).not.toContain("attendee_token");
  expect(serializedDraft).not.toContain("attendee-secret");

  await unmount(firstMount.root, firstMount.container);

  const resumed = await mountQuestionnaire(storage, questionnaireEn, clientFor());
  try {
    await waitFor(
      () => resumed.container.textContent?.includes(nextQuestion.message) === true,
      resumed.container,
    );
    // Numeric option displays through its localized label, not the raw "3".
    expect(resumed.container.textContent).toContain("5–10 years");
    expect(resumed.container.querySelector("[data-animated-item-id]")).toBeNull();
  } finally {
    await unmount(resumed.root, resumed.container);
  }
});

test(
  "a completed record only ever stores schema metadata, and remount restores it without resubmitting",
  async () => {
    const storage = createMemoryQuestionnaireStorage();
    const client = clientFor();
    const labels = labelsFor("en");
    const { container, root } = await mountQuestionnaire(storage, questionnaireEn, client);
    await startFromOpening(container, labels.start);
    await runFullJourney(container, questionnaireEn, labels);
    await waitFor(
      () => container.textContent?.includes("You’re all set.") === true,
      container,
    );

    const completed = readDraft(FORM_TOKEN, storage);
    expect(completed?.status).toBe("completed");
    expect(completed && Object.keys(completed).sort()).toEqual(
      ["formVersion", "language", "schemaVersion", "status", "updatedAt"].sort(),
    );
    await unmount(root, container);

    const completionCalls: string[] = [];
    const remounted = await mountQuestionnaire(storage, questionnaireEn, client, (token) => completionCalls.push(token));
    try {
      await waitFor(
        () => remounted.container.textContent?.includes("You’re all set.") === true,
        remounted.container,
      );
      expect(client.submitCalls).toHaveLength(1);
      expect(completionCalls).toEqual([FORM_TOKEN]);
    } finally {
      await unmount(remounted.root, remounted.container);
    }
  },
  15_000,
);
