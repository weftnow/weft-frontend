import { z } from "zod";
import { submitQuestionnaire } from "@/features/questionnaire/api/server/questionnaire.gateway";
import {
  formSubmissionSchema,
  formTokenSchema,
} from "@/features/questionnaire/schemas/questionnaire.contract.schema";
import { questionnaireFailureResponse } from "../../_lib/response";

const idempotencyKeySchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formToken: string }> },
) {
  const tokenResult = formTokenSchema.safeParse((await params).formToken);
  const keyResult = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  const rawBody = await request.json().catch(() => null);
  const bodyResult = formSubmissionSchema.safeParse(rawBody);

  if (!tokenResult.success || !keyResult.success || !bodyResult.success) {
    return Response.json(
      { code: "validation" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const outcome = await submitQuestionnaire(tokenResult.data, keyResult.data, bodyResult.data);

  if (outcome.status !== "ok") {
    return questionnaireFailureResponse(outcome);
  }

  const response = Response.json({ status: "completed" }, { status: 201 });
  response.headers.append("Set-Cookie", outcome.setCookie);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
