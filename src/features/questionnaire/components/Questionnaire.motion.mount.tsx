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
    matches: false,
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
const { createMemoryQuestionnaireStorage } = await import("../persistence/questionnaire.storage");
const { testFlowQuestionnaire } = await import("../test/testFlowQuestionnaire");

const FORM_TOKEN = "token-valid-123456";

function clientFor() {
  return {
    async loadLanguage() {
      return testFlowQuestionnaire;
    },
    async submit() {},
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 6_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("Typing did not finish");
    await act(async () => wait(20));
  }
}

function buttonNamed(container: HTMLElement, name: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`Button not found: ${name}`);
  return button;
}

test(
  "answer controls stay absent until both opening messages finish typing",
  async () => {
    const storage = createMemoryQuestionnaireStorage();
    const container = dom.window.document.createElement("div");
    dom.window.document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <Questionnaire
            client={clientFor()}
            formToken={FORM_TOKEN}
            initialQuestionnaire={testFlowQuestionnaire}
            storage={storage}
            timings={{ conversationalPauseMs: 0, transitionDelayMs: 0 }}
          />,
        );
      });

      await waitFor(() => container.textContent?.includes("Start") === true);
      act(() => buttonNamed(container, "Start").click());
      await waitFor(
        () => container.querySelector("[data-questionnaire-phase]") !== null,
      );

      expect(
        container
          .querySelector("[data-questionnaire-phase]")
          ?.getAttribute("data-questionnaire-phase"),
      ).toBe("weft_typing");
      expect(container.querySelector('[role="radiogroup"]')).toBeNull();

      await waitFor(() => container.querySelector('[role="radiogroup"]') !== null);
      expect(
        container
          .querySelector("[data-questionnaire-phase]")
          ?.getAttribute("data-questionnaire-phase"),
      ).toBe("awaiting_answer");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  },
  8_000,
);
