import { ConversationSourceError } from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";
import { EventFeedbackGatewayError } from "@/features/eventFeedback/api/server/eventFeedback.gateway";
import { getEventFeedbackRepository } from "@/features/eventFeedback/api/server/eventFeedback.source";
import { eventFeedbackSubmissionSchema } from "@/features/eventFeedback/schemas/eventFeedback.schema";

type Context = { params: Promise<{ eventId: string }> };

/**
 * Every failure here is answered with a status the screen can act on. An
 * unmapped throw would surface as a 500 and put the guest on a retry button
 * that can never succeed, which is exactly the failure mode worth avoiding on
 * the last screen of the night.
 */
function failure(error: unknown): Response {
  if (error instanceof ConversationSourceError) {
    return Response.json({ code: error.code }, { status: 503 });
  }
  if (error instanceof EventFeedbackGatewayError) {
    if (error.code === "no_attendee_token") {
      return Response.json({ code: error.code }, { status: 401 });
    }
    if (error.code === "already_submitted") {
      return Response.json({ code: error.code }, { status: 409 });
    }
    if (error.code === "invalid") {
      return Response.json({ code: error.code }, { status: 400 });
    }
    return Response.json({ code: error.code }, { status: 503 });
  }
  console.error("event feedback route failed", "unexpected");
  return Response.json({ code: "unavailable" }, { status: 503 });
}

export async function GET(_request: Request, context: Context) {
  const parsed = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsed.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }
  try {
    const repository = await getEventFeedbackRepository();
    return Response.json(await repository.status(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: Context) {
  const parsedEventId = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsedEventId.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsedBody = eventFeedbackSubmissionSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return Response.json({ code: "invalid_body" }, { status: 400 });
  }

  try {
    const repository = await getEventFeedbackRepository();
    await repository.submit(parsedEventId.data, parsedBody.data);
    return Response.json(
      { status: "recorded" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
