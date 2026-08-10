import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsQueryKey } from "../hooks/useFastQuestions";
import { mapIcebreakerState } from "../model/fastQuestions.mapper";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { IcebreakerStateDto } from "../schemas/icebreaker.contract.schema";
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

test("the ring sweeps for a legacy session the mapper had to backfill a start for", () => {
  // A session created before the backend carried turn_starts_at arrives with
  // it null. The mapper must derive a past instant (end minus duration), not
  // fall back to the end instant — that would read as "still in the gap" and
  // freeze the ring for the whole turn. Goes through the real mapper so a
  // regression back to the end-instant fallback is caught here too.
  const dto: IcebreakerStateDto = {
    session_id: "5b9c2f3e-0a1d-4b6e-9c3a-7f2e1d4a8b6c",
    status: "running",
    language: "en",
    phase: 1,
    round: 1,
    total_rounds: 3,
    question: { code: "Q001", text: "One" },
    rounds: [
      { code: "Q001", text: "One", participant_duration_seconds: 30 },
      { code: "Q031", text: "Two", participant_duration_seconds: 45 },
      { code: "Q066", text: "Three", participant_duration_seconds: 60 },
    ],
    challenge: null,
    current_participant: { attendee_id: "11111111-1111-4111-8111-111111111111", name: "Ana" },
    participant_order: [
      { attendee_id: "11111111-1111-4111-8111-111111111111", name: "Ana" },
      { attendee_id: "22222222-2222-4222-8222-222222222222", name: "Bruno" },
      { attendee_id: "33333333-3333-4333-8333-333333333333", name: "Carla" },
    ],
    viewer: { attendee_id: "11111111-1111-4111-8111-111111111111", name: "Ana" },
    turn_index: 0,
    participant_duration_seconds: 30,
    turn_starts_at: null,
    turn_ends_at: new Date(Date.now() + 29_000).toISOString(),
    closing_line: null,
  };
  const mapped = mapIcebreakerState(EVENT_ID, dto);

  const { container } = renderFastQuestionsSession({
    status: "active",
    timerStartedAt: mapped.timerStartedAt,
    timerEndsAt: mapped.timerEndsAt,
  });
  const timer = container.querySelector('[role="timer"]');
  const sweepMarker = timer?.querySelector('[data-progress-marker-motion="true"]');
  expect(sweepMarker?.hasAttribute("class")).toBe(true);
});
