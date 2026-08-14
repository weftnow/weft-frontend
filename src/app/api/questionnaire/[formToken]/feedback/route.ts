import { ConversationSourceError } from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import { EventFeedbackGatewayError } from "@/features/eventFeedback/api/server/eventFeedback.gateway";
import { createFormTokenEventFeedbackRepository } from "@/features/eventFeedback/api/server/formTokenEventFeedback.repository";
import { eventFeedbackSubmissionSchema } from "@/features/eventFeedback/schemas/eventFeedback.schema";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";

type Context = { params: Promise<{ formToken: string }> };

const headers = { "Cache-Control": "no-store" };

/**
 * Keyed by form token, like the conversation and the group reveal: the token is
 * what `/resume` trades for a credential the backend accepts. The event id is
 * not enough — nothing on this side can turn one into a session.
 *
 * Every failure is answered with a status the screen can act on. An unmapped
 * throw would surface as a 500 and put the guest on a retry button that can
 * never succeed, which is exactly the failure mode worth avoiding on the last
 * screen of the night.
 */
function failure(error: unknown): Response {
  if (error instanceof ConversationSourceError) {
    return Response.json({ code: error.code }, { status: 503, headers });
  }
  if (error instanceof EventFeedbackGatewayError) {
    if (error.code === "no_attendee_token") {
      return Response.json({ code: error.code }, { status: 401, headers });
    }
    if (error.code === "already_submitted") {
      return Response.json({ code: error.code }, { status: 409, headers });
    }
    if (error.code === "invalid") {
      return Response.json({ code: error.code }, { status: 400, headers });
    }
    return Response.json({ code: error.code }, { status: 503, headers });
  }
  console.error("event feedback route failed", "unexpected");
  return Response.json({ code: "unavailable" }, { status: 503, headers });
}

export async function GET(request: Request, context: Context) {
  const parsed = formTokenSchema.safeParse((await context.params).formToken);
  if (!parsed.success) {
    return Response.json({ code: "invalid_form_token" }, { status: 400, headers });
  }
  try {
    const repository = await createFormTokenEventFeedbackRepository(
      parsed.data,
      request.headers.get("cookie"),
    );
    return Response.json(await repository.status(parsed.data), { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: Context) {
  const parsedToken = formTokenSchema.safeParse((await context.params).formToken);
  if (!parsedToken.success) {
    return Response.json({ code: "invalid_form_token" }, { status: 400, headers });
  }

  const rawBody = await request.json().catch(() => null);
  const parsedBody = eventFeedbackSubmissionSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return Response.json({ code: "invalid_body" }, { status: 400, headers });
  }

  try {
    const repository = await createFormTokenEventFeedbackRepository(
      parsedToken.data,
      request.headers.get("cookie"),
    );
    await repository.submit(parsedToken.data, parsedBody.data);
    return Response.json({ status: "recorded" }, { status: 201, headers });
  } catch (error) {
    return failure(error);
  }
}
