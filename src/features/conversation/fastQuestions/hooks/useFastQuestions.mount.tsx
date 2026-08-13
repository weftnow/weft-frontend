import { afterEach, expect, test } from "bun:test";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { ConversationApi } from "../../types/conversation.types";
import type { FastQuestionsSession } from "../types/fastQuestions.types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/fast-questions",
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
Object.assign(globalThis, {
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  SVGElement: dom.window.SVGElement,
  document: dom.window.document,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  navigator: dom.window.navigator,
  window: dom.window,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// Fail the suite on any React "not wrapped in act(...)" warning instead of
// letting it pass silently — this mount test exercises async effects
// (polling, the start request, transition timers) that are easy to leave
// unguarded.
const actWarnings: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.map((arg) => String(arg)).join(" ");
  if (message.includes("not wrapped in act")) {
    actWarnings.push(message);
  }
  originalConsoleError(...(args as Parameters<typeof console.error>));
};

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { useFastQuestions } = await import("./useFastQuestions");
const { createMockFastQuestionsSession } = await import("../data/mockFastQuestions");
const { startSessionAt } = await import("../model/fastQuestions.machine");

const EVENT_ID = "6071af2e-7936-4b15-bb44-e4d917337543";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("useFastQuestions mount test timed out");
    await act(async () => wait(10));
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });
}

/** Waiting → records exactly one start call → active. */
function createFakeApi(): ConversationApi & { startCalls: string[] } {
  const waitingSession = createMockFastQuestionsSession(EVENT_ID);
  const activeSession = startSessionAt(waitingSession, Date.now());
  const startCalls: string[] = [];
  let currentSession: FastQuestionsSession = waitingSession;

  return {
    startCalls,
    async getConversationSession() {
      return currentSession;
    },
    async startFastQuestionsPhase(eventId: string) {
      startCalls.push(eventId);
      currentSession = activeSession;
      return activeSession;
    },
    async advanceParticipantTurn() {
      throw new Error("advanceParticipantTurn should not be called in this test");
    },
    async continueToPhaseTwo() {
      throw new Error("continueToPhaseTwo should not be called in this test");
    },
  };
}

function Probe({ api }: { api: ConversationApi }) {
  const { session, startPhase, viewState } = useFastQuestions(EVENT_ID, {
    api,
    transitionSettleMs: 0,
  });
  return (
    <div>
      <span data-testid="status">{session?.status ?? ""}</span>
      <span data-testid="view-state">{viewState ?? ""}</span>
      <button data-testid="start" onClick={startPhase} type="button">start</button>
    </div>
  );
}

afterEach(() => {
  const warnings = actWarnings.splice(0, actWarnings.length);
  expect(warnings).toEqual([]);
});

test("never starts a waiting session on its own, and starts once on an explicit tap", async () => {
  const api = createFakeApi();
  const queryClient = createTestQueryClient();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe api={api} />
        </QueryClientProvider>,
      );
    });

    // The regression this test exists for: the first phone to open the page
    // used to start the clock for the whole table just by mounting.
    await waitFor(() => container.textContent?.includes("waiting") === true);
    await act(async () => wait(50));
    expect(api.startCalls).toEqual([]);
    expect(container.textContent).toContain("waiting");

    const startButton = container.querySelector<HTMLButtonElement>("[data-testid='start']");
    // Two taps in the same beat are one start: the in-flight guard holds.
    await act(async () => {
      startButton?.click();
      startButton?.click();
    });

    await waitFor(() => container.textContent?.includes("participant_active") === true);

    expect(api.startCalls).toEqual([EVENT_ID]);
    expect(container.textContent).toContain("active");
    expect(container.textContent).toContain("participant_active");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    queryClient.clear();
  }
});
