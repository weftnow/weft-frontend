import {
  conversationSource,
  type ConversationEnvironment,
} from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import type { EventFeedbackStore } from "./eventFeedback.gateway";

/**
 * Feedback follows the conversation's source, deliberately: they are two
 * screens of one session, and a room running against the real backend must not
 * have its feedback quietly land in an in-memory mock. One env var, one
 * decision — including the hard failure when production leaves it unset.
 *
 * The repository modules are imported dynamically so that loading this module
 * never forces resolution of the `server-only`-guarded ones, keeping Bun unit
 * tests free of `server-only`.
 */
export async function getEventFeedbackRepository(
  environment: ConversationEnvironment = process.env,
): Promise<EventFeedbackStore> {
  if (conversationSource(environment) === "mock") {
    const { mockEventFeedbackRepository } = await import("./mockEventFeedback.repository");
    return mockEventFeedbackRepository;
  }
  const { backendEventFeedbackRepository } = await import("./backendEventFeedback.repository");
  return backendEventFeedbackRepository;
}
