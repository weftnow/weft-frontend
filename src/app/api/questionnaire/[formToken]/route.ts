import { loadQuestionnaire } from "@/features/questionnaire/api/server/questionnaire.gateway";
import {
  formTokenSchema,
  languageSchema,
} from "@/features/questionnaire/schemas/questionnaire.contract.schema";
import { questionnaireFailureResponse } from "../_lib/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formToken: string }> },
) {
  const tokenResult = formTokenSchema.safeParse((await params).formToken);
  const languageResult = languageSchema.safeParse(
    new URL(request.url).searchParams.get("lang"),
  );

  if (!tokenResult.success || !languageResult.success) {
    return Response.json(
      { code: "validation" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const outcome = await loadQuestionnaire(tokenResult.data, languageResult.data);
  if (outcome.status === "ok") {
    return Response.json(outcome.questionnaire, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return questionnaireFailureResponse(outcome);
}
