import {
  ConversationSourceError,
  getFastQuestionsRepository,
} from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(_request: Request, context: Context) {
  const parsed = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsed.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }
  try {
    const repository = await getFastQuestionsRepository();
    return Response.json(await repository.continueToPhaseTwo(parsed.data));
  } catch (error) {
    if (error instanceof ConversationSourceError) {
      return Response.json({ code: error.code }, { status: 503 });
    }
    throw error;
  }
}
