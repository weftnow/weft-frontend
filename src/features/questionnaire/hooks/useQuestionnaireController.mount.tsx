import { expect, test } from "bun:test";
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
const { useQuestionnaireController } = await import("./useQuestionnaireController");
const { QuestionnaireClientError } = await import("../api/client/questionnaire.client");
const { mapQuestionnaireDefinition } = await import("../model/questionnaire.mapper");
const { formDefinitionSchema } = await import("../schemas/questionnaire.contract.schema");
const { backendFormEn, backendFormEs } = await import("../test/backendFormFixtures");
const { createMemoryQuestionnaireStorage, draftKey, readDraft } = await import(
  "../persistence/questionnaire.storage"
);

const FORM_TOKEN = "token-valid-123456";

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

type FakeClientOptions = {
  es?: typeof questionnaireEs;
  en?: typeof questionnaireEn;
  submitFailures?: number;
  submitError?: { code: string; field?: string };
};

function fakeClient(options: FakeClientOptions = {}) {
  const loadLanguageCalls: string[] = [];
  const submitCalls: { submissionId: string }[] = [];
  let remaining = options.submitFailures ?? (options.submitError ? Infinity : 0);
  const failureData = options.submitError ?? { code: "unavailable" };

  return {
    loadLanguageCalls,
    submitCalls,
    async loadLanguage(_formToken: string, language: "en" | "es") {
      loadLanguageCalls.push(language);
      if (language === "es" && options.es) return options.es;
      if (language === "en" && options.en) return options.en;
      throw new QuestionnaireClientError({ code: "unavailable" });
    },
    async submit(_formToken: string, submissionId: string) {
      submitCalls.push({ submissionId });
      if (remaining > 0) {
        remaining -= 1;
        throw new QuestionnaireClientError(
          failureData as { code: "unavailable"; field?: string },
        );
      }
    },
  };
}

function storageWith(record: unknown) {
  return createMemoryQuestionnaireStorage(JSON.stringify(record));
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Controller timed out");
    await act(async () => wait(10));
  }
}

async function mountController({
  initialQuestionnaire,
  client,
  storage,
}: {
  initialQuestionnaire: typeof questionnaireEn;
  client: ReturnType<typeof fakeClient>;
  storage?: ReturnType<typeof createMemoryQuestionnaireStorage>;
}) {
  const resolvedStorage = storage ?? createMemoryQuestionnaireStorage();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root = createRoot(container);
  const ref: { current: ReturnType<typeof useQuestionnaireController> | null } = {
    current: null,
  };

  function Harness() {
    ref.current = useQuestionnaireController(
      FORM_TOKEN,
      initialQuestionnaire,
      client,
      resolvedStorage,
    );
    return null;
  }

  await act(async () => {
    root.render(<Harness />);
  });

  return {
    get current() {
      if (!ref.current) throw new Error("Controller not mounted");
      return ref.current;
    },
    storage: resolvedStorage,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

async function mountFullyAnsweredController(
  client: ReturnType<typeof fakeClient>,
  seedDraft?: unknown,
) {
  const storage = seedDraft ? storageWith(seedDraft) : createMemoryQuestionnaireStorage();
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client, storage });
  await waitFor(() => harness.current.view === "opening" || harness.current.view === "conversation");

  if (harness.current.view === "opening") {
    await act(async () => harness.current.start("en"));
  }

  for (const question of harness.current.result!.questionnaire.questions) {
    if (harness.current.result!.session.answers[question.id] !== undefined) continue;
    await act(async () =>
      harness.current.submitAnswer({
        questionId: question.id,
        value: COMPLETE_ANSWERS[question.id] as never,
      }),
    );
  }

  return harness;
}

test("fresh visit opens language selection and starts without an answer request", async () => {
  const client = fakeClient();
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client });
  await waitFor(() => harness.current.view === "opening");
  expect(harness.current.view).toBe("opening");
  await act(async () => harness.current.start("en"));
  expect(harness.current.view).toBe("conversation");
  expect(client.loadLanguageCalls).toEqual([]);
  expect(client.submitCalls).toEqual([]);
  await harness.unmount();
});

test("Spanish selection loads once before starting and persists language", async () => {
  const client = fakeClient({ es: questionnaireEs });
  const harness = await mountController({ initialQuestionnaire: questionnaireEn, client });
  await waitFor(() => harness.current.view === "opening");
  await act(async () => harness.current.start("es"));
  expect(client.loadLanguageCalls).toEqual(["es"]);
  expect(readDraft(FORM_TOKEN, harness.storage)?.language).toBe("es");
  await harness.unmount();
});

test("resumed Spanish draft bypasses opening without flashing English", async () => {
  const spanishDraft = {
    schemaVersion: 1,
    formVersion: "v1",
    language: "es",
    updatedAt: new Date().toISOString(),
    status: "draft",
    answers: {},
    currentQuestionIndex: 0,
    submissionId: "91acb4f0-77e4-4d7b-9ed9-cb70a44696dc",
  };
  const storage = storageWith(spanishDraft);
  const client = fakeClient({ es: questionnaireEs });
  const harness = await mountController({
    initialQuestionnaire: questionnaireEn,
    client,
    storage,
  });
  await waitFor(() => harness.current.view === "conversation");
  expect(harness.current.result?.questionnaire.language).toBe("es");
  expect(client.loadLanguageCalls).toEqual(["es"]);
  await harness.unmount();
});

test("failed final submission keeps one key and every answer for retry", async () => {
  const client = fakeClient({ submitFailures: 1 });
  const harness = await mountFullyAnsweredController(client);
  let threw = false;
  try {
    await act(async () => harness.current.completeQuestionnaire());
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
  const firstKey = readDraft(FORM_TOKEN, harness.storage);
  const firstSubmissionId =
    firstKey && firstKey.status === "draft" ? firstKey.submissionId : null;
  expect(firstSubmissionId).not.toBeNull();

  await act(async () => harness.current.completeQuestionnaire());
  expect(client.submitCalls.map((call) => call.submissionId)).toEqual([
    firstSubmissionId,
    firstSubmissionId,
  ]);
  expect(readDraft(FORM_TOKEN, harness.storage)?.status).toBe("completed");
  await harness.unmount();
});

test("draftKey scopes storage per form token", () => {
  expect(draftKey("a")).not.toBe(draftKey("b"));
});
