import { confirmGroup, GroupRevealGatewayError } from "@/features/groupReveal/api/server/groupReveal.gateway";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request, { params }: { params: Promise<{ formToken: string }> }) {
  const parsed = formTokenSchema.safeParse((await params).formToken);
  if (!parsed.success) return Response.json({ code: "validation" }, { status: 400, headers });
  try { await confirmGroup(parsed.data, request.headers.get("cookie")); return Response.json({ status: "confirmed" }, { headers }); }
  catch (error) { const code = error instanceof GroupRevealGatewayError ? error.code : "unavailable"; return Response.json({ code }, { status: code === "no_session" ? 401 : code === "conflict" ? 409 : 503, headers }); }
}
