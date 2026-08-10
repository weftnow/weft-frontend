import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsQueryKey } from "../hooks/useFastQuestions";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { FastQuestionsApi, FastQuestionsSession } from "../types/fastQuestions.types";
import { FastQuestionsExperience } from "./FastQuestions";
import { FastQuestionsCompletion } from "./FastQuestionsCompletion";
import { ParticipantList } from "./ParticipantList";
import { QuestionDisplay } from "./QuestionDisplay";
import { RoundProgress } from "./RoundProgress";

const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";

const session = createMockFastQuestionsSession(EVENT_ID);

test("keeps the question as the primary heading", () => {
  const html = renderToStaticMarkup(<QuestionDisplay round={session.rounds[0]} />);
  expect(html).toContain("<h1");
  expect(html).toContain("What&#x27;s one thing you&#x27;re working on right now?");
});

test("marks exactly one active participant and preserves full names", () => {
  const html = renderToStaticMarkup(
    <ParticipantList activeParticipantId="antonio" participants={session.participants} />,
  );
  expect((html.match(/data-active="true"/g) ?? [])).toHaveLength(1);
  expect(html).toContain("Antonio, currently responding");
  expect(html).toContain("María");
});

test("renders three round indicators and current count", () => {
  const html = renderToStaticMarkup(<RoundProgress currentRoundIndex={1} />);
  expect((html.match(/data-round-indicator/g) ?? [])).toHaveLength(3);
  expect(html).toContain("2 of 3");
});

test("completion does not introduce Phase 2 content", () => {
  const html = renderToStaticMarkup(<FastQuestionsCompletion onContinue={() => {}} />);
  expect(html).toContain("Fast questions complete.");
  expect(html).toContain("Continue");
  expect(html).not.toContain("Shared Challenge");
});

// `FastQuestionsExperience` reads its session synchronously off a pre-seeded
// query cache, so `renderToStaticMarkup` renders the active turn in one pass
// with no DOM or effects required — matching this file's other cases, just
// wired through the query client the real component depends on.
function renderFastQuestionsSession(overrides: Partial<FastQuestionsSession>) {
  const active = fastQuestionsSessionSchema.parse({ ...session, ...overrides });
  const queryClient = new QueryClient();
  queryClient.setQueryData(fastQuestionsQueryKey(EVENT_ID), active);
  const api: FastQuestionsApi = {
    async getConversationSession() { return active; },
    async startFastQuestionsPhase() { return active; },
    async advanceParticipantTurn() { return active; },
  };
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <FastQuestionsExperience api={api} eventId={EVENT_ID} transitionSettleMs={0} />
    </QueryClientProvider>,
  );
  const { document } = new JSDOM(html).window;
  return { container: document.body };
}

test("the ring is not sweeping while the reading gap is still open", () => {
  const { container } = renderFastQuestionsSession({
    status: "active",
    timerStartedAt: new Date(Date.now() + 5_000).toISOString(),
    timerEndsAt: new Date(Date.now() + 35_000).toISOString(),
  });
  const timer = container.querySelector('[role="timer"]');
  // CircularTimer already clamps the ring to full during the gap (unrelated
  // to this fix); what's under test is that it also isn't sweeping. It only
  // adds a `*Running` modifier class when `running` is true, and CSS Modules
  // resolve to `undefined` under bun test, so React drops the `className`
  // prop entirely when not running — the class attribute's presence is a
  // faithful proxy for the `running` flag reaching CircularTimer.
  const sweepMarker = timer?.querySelector('[data-progress-marker-motion="true"]');
  expect(sweepMarker?.hasAttribute("class")).toBe(false);
});

test("the ring sweeps once the reading gap has closed", () => {
  const { container } = renderFastQuestionsSession({
    status: "active",
    timerStartedAt: new Date(Date.now() - 1_000).toISOString(),
    timerEndsAt: new Date(Date.now() + 29_000).toISOString(),
  });
  const timer = container.querySelector('[role="timer"]');
  const sweepMarker = timer?.querySelector('[data-progress-marker-motion="true"]');
  expect(sweepMarker?.hasAttribute("class")).toBe(true);
});
