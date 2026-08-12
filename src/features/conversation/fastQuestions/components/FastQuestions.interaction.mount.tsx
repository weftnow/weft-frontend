import { afterEach, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { startSessionAt } from "../model/fastQuestions.machine";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
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
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    removeEventListener() {},
  }),
});

Object.assign(globalThis, {
  CustomEvent: dom.window.CustomEvent,
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

const actWarnings: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.map((arg) => String(arg)).join(" ");
  if (message.includes("not wrapped in act")) actWarnings.push(message);
  originalConsoleError(...(args as Parameters<typeof console.error>));
};

afterEach(() => {
  const warnings = actWarnings.splice(0, actWarnings.length);
  expect(warnings).toEqual([]);
});

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { FastQuestionsExperience } = await import("./FastQuestions");
const { conversationQueryKey } = await import("../../hooks/useConversationSession");

const EVENT_ID = "6071af2e-7936-4b15-bb44-e4d917337543";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
}

function createActiveSession(
  session: FastQuestionsSession,
  roundIndex: number,
  participantIndex: number,
) {
  const now = Date.now();
  const durationSeconds = session.rounds[roundIndex].participantDurationSeconds;
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "active",
    roundIndex,
    participantIndex,
    timerStartedAt: new Date(now).toISOString(),
    timerEndsAt: new Date(now + durationSeconds * 1_000).toISOString(),
  });
}

function createProgressingApi() {
  const waiting = createMockFastQuestionsSession(EVENT_ID);
  let session: FastQuestionsSession = waiting;
  const api: ConversationApi & {
    /** Phase-1 typed, unlike the API's own union-returning read. */
    current(): FastQuestionsSession;
    set(next: FastQuestionsSession): void;
  } = {
    async advanceParticipantTurn() {
      return session;
    },
    async getConversationSession() {
      return session;
    },
    async startFastQuestionsPhase() {
      session = startSessionAt(waiting, Date.now());
      return session;
    },
    async continueToPhaseTwo() {
      return session;
    },
    current() {
      return session;
    },
    set(next) {
      session = next;
    },
  };
  return api;
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(condition: () => boolean, container: HTMLElement) {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`FastQuestions mount timed out: ${container.textContent ?? ""}`);
    }
    await act(async () => wait(10));
  }
}

async function refetch(queryClient: QueryClient) {
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: conversationQueryKey(EVENT_ID) });
  });
}

test("renders only canonical Phase 1 transitions without timer announcements", async () => {
  const api = createProgressingApi();
  const queryClient = createTestQueryClient();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FastQuestionsExperience api={api} eventId={EVENT_ID} transitionSettleMs={0} />
        </QueryClientProvider>,
      );
    });

    await waitFor(() => container.textContent?.includes("Antonio’s turn") === true, container);
    expect(container.textContent).toContain("Round 1 of 3");
    expect(container.textContent).toContain("Antonio’s turn");
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);

    const first = createActiveSession(api.current(), 0, 1);
    api.set(first);
    await refetch(queryClient);
    await waitFor(() => container.textContent?.includes("María’s turn") === true, container);
    expect(container.textContent).toContain("Everyone gets 30 seconds to respond.");

    const second = createActiveSession(api.current(), 1, 0);
    api.set(second);
    await refetch(queryClient);
    await waitFor(() => container.textContent?.includes("Round 2 of 3") === true, container);
    expect(container.textContent).toContain("Antonio’s turn");

    const currentUser = createActiveSession(api.current(), 1, 4);
    api.set(currentUser);
    await refetch(queryClient);
    await waitFor(() => container.textContent?.includes("Your turn") === true, container);
    expect(container.textContent).not.toContain("You’s turn");
    expect(container.querySelector("[data-fast-questions-announcement]")?.textContent).not.toContain("00:");

    // The phase boundary stops here: `FastQuestionsExperience` renders phase 1
    // and nothing else, and ConversationRouter.test.tsx covers the transition
    // screen that follows it.
  } finally {
    await act(async () => root.unmount());
    container.remove();
    queryClient.clear();
  }
});

test("renders a retryable notice when the canonical session cannot load", async () => {
  const queryClient = createTestQueryClient();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  const api: ConversationApi = {
    async advanceParticipantTurn() {
      throw new Error("not reached");
    },
    async getConversationSession() {
      throw new Error("offline");
    },
    async startFastQuestionsPhase() {
      throw new Error("not reached");
    },
    async continueToPhaseTwo() {
      throw new Error("not reached");
    },
  };

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FastQuestionsExperience api={api} eventId={EVENT_ID} transitionSettleMs={0} />
        </QueryClientProvider>,
      );
    });
    await waitFor(
      () => container.textContent?.includes("We couldn’t sync the conversation.") === true,
      container,
    );
    expect(container.textContent).toContain("Retry");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    queryClient.clear();
  }
});
