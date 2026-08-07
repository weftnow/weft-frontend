import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  createMemoryQuestionnaireStorage,
  getQuestionnaire,
  submitAnswer,
  type QuestionnaireApi,
} from "../api/questionnaire.api";
import type { SubmitAnswerInput } from "../types/questionnaire.types";
import { useQuestionnaire } from "./useQuestionnaire";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/questionnaire",
});
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  document: dom.window.document,
  navigator: dom.window.navigator,
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for hook");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

test("submission writes the canonical API result into the query cache", async () => {
  const storage = createMemoryQuestionnaireStorage();
  let getCalls = 0;
  let submitFromHarness:
    | ((input: SubmitAnswerInput) => Promise<unknown>)
    | undefined;
  const api: QuestionnaireApi = {
    getQuestionnaire: async () => {
      getCalls += 1;
      return getQuestionnaire(storage);
    },
    submitAnswer: (input) => submitAnswer(input, storage),
    completeQuestionnaire: async () => {
      throw new Error("not used");
    },
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);

  function Harness() {
    const questionnaire = useQuestionnaire(api);
    submitFromHarness = questionnaire.submitAnswer;
    return (
      <p>
        index:{questionnaire.result?.session.currentQuestionIndex ?? "loading"}
      </p>
    );
  }

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => container.textContent?.includes("index:0") === true);
    const initial = await getQuestionnaire(storage);
    const first = initial.questionnaire.questions[0];
    const value = first.type === "single_choice" ? first.options[0].value : "";
    if (!submitFromHarness) throw new Error("submit hook was not exposed");

    await act(async () => {
      await submitFromHarness?.({ questionId: first.id, value });
    });
    await waitFor(() => container.textContent?.includes("index:1") === true);

    expect(container.textContent).toContain("index:1");
    expect(getCalls).toBe(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    client.clear();
  }
});

test("mutation errors remain exposed without discarding loaded data", async () => {
  const storage = createMemoryQuestionnaireStorage();
  let submitFromHarness:
    | ((input: SubmitAnswerInput) => Promise<unknown>)
    | undefined;
  const api: QuestionnaireApi = {
    getQuestionnaire: () => getQuestionnaire(storage),
    submitAnswer: async () => {
      throw new Error("Connection lost");
    },
    completeQuestionnaire: async () => {
      throw new Error("not used");
    },
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);

  function Harness() {
    const questionnaire = useQuestionnaire(api);
    submitFromHarness = questionnaire.submitAnswer;
    return (
      <p>
        {questionnaire.result ? "loaded" : "loading"}:
        {questionnaire.error?.message ?? "no-error"}
      </p>
    );
  }

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });
    await waitFor(() => container.textContent?.includes("loaded") === true);
    const initial = await getQuestionnaire(storage);
    const first = initial.questionnaire.questions[0];
    const value = first.type === "single_choice" ? first.options[0].value : "";
    if (!submitFromHarness) throw new Error("submit hook was not exposed");

    try {
      await act(async () => {
        await submitFromHarness?.({ questionId: first.id, value });
      });
    } catch {
      // The hook exposes the same mutation error to the rendered controller.
    }
    await waitFor(
      () => container.textContent?.includes("Connection lost") === true,
    );

    expect(container.textContent).toContain("loaded:Connection lost");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    client.clear();
  }
});
