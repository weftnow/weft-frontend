import type { EventFeedbackStatus, EventFeedbackSubmission } from "../../schemas/eventFeedback.schema";
import { EventFeedbackGatewayError, type EventFeedbackStore } from "./eventFeedback.gateway";

/**
 * Names matching the mock Fast Questions group, so the meet-again question
 * lists the same people locally that a real session would.
 */
const MOCK_TABLEMATES = [
  { displayName: "Ana" },
  { displayName: "Beto" },
  { displayName: "Carla" },
  { displayName: "Diego" },
];

/**
 * In-memory stand-in so the whole ending — challenge, closing screen, feedback,
 * thanks — can be walked through locally without a backend. Mirrors the one
 * rule that matters: a second submission is refused.
 *
 * Module-level state is deliberate and matches the mock Fast Questions store:
 * it lives for the life of the dev server and resets on restart.
 */
export function createMockEventFeedbackStore(): EventFeedbackStore {
  const submitted = new Map<string, EventFeedbackSubmission>();

  return {
    async status(eventId: string): Promise<EventFeedbackStatus> {
      if (submitted.has(eventId)) return { submitted: true, tablemates: [] };
      return { submitted: false, tablemates: MOCK_TABLEMATES };
    },

    async submit(eventId: string, answers: EventFeedbackSubmission): Promise<void> {
      if (submitted.has(eventId)) {
        throw new EventFeedbackGatewayError("already_submitted", "Feedback already recorded");
      }
      submitted.set(eventId, answers);
    },
  };
}
