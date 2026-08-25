import { loadGroup, GroupRevealGatewayError } from "@/features/groupReveal/api/server/groupReveal.gateway";
import { formTokenSchema } from "@/features/questionnaire/schemas/questionnaire.contract.schema";

const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request, { params }: { params: Promise<{ formToken: string }> }) {
  const parsed = formTokenSchema.safeParse((await params).formToken);
  if (!parsed.success) return Response.json({ code: "validation" }, { status: 400, headers });
  try { const result = await loadGroup(parsed.data, request.headers.get("cookie")); return result.status === "waiting" ? new Response(null, { status: 204, headers }) : Response.json(result.group, { headers }); }
  catch (error) { const code = error instanceof GroupRevealGatewayError ? error.code : "unavailable"; return Response.json({ code }, { status: code === "no_session" ? 401 : code === "event_over" ? 410 : 503, headers }); }
}
