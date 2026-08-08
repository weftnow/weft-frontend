import {
  ConversationSourceError,
  getFastQuestionsRepository,
} from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import {
  advanceParticipantInputSchema,
  eventIdSchema,
} from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Context) {
  const parsedEventId = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsedEventId.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsedBody = advanceParticipantInputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return Response.json({ code: "invalid_body" }, { status: 400 });
  }

  try {
    const repository = await getFastQuestionsRepository();
    return Response.json(await repository.advance(parsedEventId.data, parsedBody.data));
  } catch (error) {
    if (error instanceof ConversationSourceError) {
      return Response.json({ code: error.code }, { status: 503 });
    }
    throw error;
  }
}
