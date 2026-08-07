import { loadBank } from "@/features/demo-b2c/api/server/bank";

/**
 * The questions, same-origin. Deliberately uncached at the route level: the
 * hour-long memo lives in loadBank, so a cached route would only add a second,
 * staler layer -- and would freeze a fallback response in place if the backend
 * happened to be down when it was filled.
 */
export async function GET() {
  const { bank, source } = await loadBank();
  return Response.json(bank, { headers: { "x-weft-bank-source": source } });
}
