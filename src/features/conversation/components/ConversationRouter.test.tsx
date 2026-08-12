import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMockFastQuestionsSession } from "../fastQuestions/data/mockFastQuestions";
import { startSessionAt } from "../fastQuestions/model/fastQuestions.machine";
import { fastQuestionsSessionSchema } from "../fastQuestions/schemas/fastQuestions.schema";
import { conversationQueryKey } from "../hooks/useConversationSession";
import { sharedChallengeSessionSchema } from "../sharedChallenge/schemas/sharedChallenge.schema";
import type { ConversationApi, ConversationSession } from "../types/conversation.types";
import { ConversationRouter } from "./ConversationRouter";

const EVENT_ID = "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c";

/**
 * The router reads its session synchronously off a pre-seeded query cache, so
 * `renderToStaticMarkup` renders the matching screen in one pass with no DOM
 * or effects required.
 */
function render(session: ConversationSession) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(conversationQueryKey(EVENT_ID), session);
  const api: ConversationApi = {
    async getConversationSession() { return session; },
    async startFastQuestionsPhase() { return session; },
    async advanceParticipantTurn() { return session; },
    async continueToPhaseTwo() { return session; },
  };
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ConversationRouter api={api} eventId={EVENT_ID} transitionSettleMs={0} />
    </QueryClientProvider>,
  );
}

const waiting = createMockFastQuestionsSession(EVENT_ID);

const phaseComplete = fastQuestionsSessionSchema.parse({
  ...waiting,
  status: "phase_complete",
  roundIndex: 2,
  participantIndex: waiting.participants.length - 1,
  timerStartedAt: null,
  timerEndsAt: null,
});

function sharedChallenge(overrides: Record<string, unknown>) {
  return sharedChallengeSessionSchema.parse({
    eventId: EVENT_ID,
    phaseId: "phase_2",
    language: "en",
    status: "active",
    challenge: "If this group could change one thing about how people find work, what would it be?",
    timerStartedAt: null,
    timerEndsAt: new Date(Date.now() + 300_000).toISOString(),
    closingLine: null,
    ...overrides,
  });
}

test("a running phase one renders fast questions", () => {
  const html = render(startSessionAt(waiting, Date.now()));
  expect(html).toContain("Fast questions");
  expect(html).toContain("Round 1 of 3");
});

test("a completed phase one renders the transition screen", () => {
  const html = render(phaseComplete);
  expect(html).toContain("Phase one complete.");
  expect(html).toContain("Continue");
});

test("a running phase two renders the discussion, not the transition screen", () => {
  // The reload-mid-discussion case, and the reason this router exists: the old
  // mapper collapsed phase 2 to phase_complete, so a reload sent the group back
  // to a screen they had already passed and let them tap Continue on a session
  // that was already running.
  const html = render(sharedChallenge({}));
  expect(html).toContain("how people find work");
  expect(html).toContain("Phase 2");
  expect(html).not.toContain("Phase one complete.");
  expect(html).not.toContain(">Continue<");
});

test("a finished session renders the closing line", () => {
  const html = render(sharedChallenge({
    status: "complete",
    timerEndsAt: null,
    closingLine: "Time! Before you split — swap contacts with anyone you want to see again.",
  }));
  expect(html).toContain("swap contacts");
  expect(html).not.toContain("how people find work");
});

test("every screen follows the session's language", () => {
  const spanish = fastQuestionsSessionSchema.parse({ ...phaseComplete, language: "es" });
  expect(render(spanish)).toContain("Fase uno completada.");
  expect(render(sharedChallenge({ language: "es" }))).toContain("Fase 2");
});
