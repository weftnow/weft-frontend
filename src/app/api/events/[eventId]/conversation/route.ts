import { FastQuestionsGatewayError } from "@/features/conversation/fastQuestions/api/server/fastQuestions.gateway";
import {
  ConversationSourceError,
  getFastQuestionsRepository,
} from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

type Context = { params: Promise<{ eventId: string }> };

/**
 * This is the screen a guest lands on straight from the questionnaire, so
 * "the host hasn't started yet" and "this device never filled the form" both
 * arrive here as ordinary first visits. They get their own status codes
 * rather than falling through to a 500, which the client can only render as
 * a sync error with a retry button.
 */
const GATEWAY_STATUS: Record<FastQuestionsGatewayError["code"], number> = {
  no_session: 404,
  no_attendee_token: 401,
  unavailable: 503,
};

export async function GET(_request: Request, context: Context) {
  const parsed = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsed.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }
  try {
    const repository = await getFastQuestionsRepository();
    return Response.json(await repository.get(parsed.data));
  } catch (error) {
    if (error instanceof ConversationSourceError) {
      return Response.json({ code: error.code }, { status: 503 });
    }
    if (error instanceof FastQuestionsGatewayError) {
      return Response.json({ code: error.code }, { status: GATEWAY_STATUS[error.code] });
    }
    throw error;
  }
}
