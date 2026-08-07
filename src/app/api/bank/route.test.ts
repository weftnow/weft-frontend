import { expect, test } from "bun:test";
import { resetBankCache } from "@/lib/server/bank";
import { GET } from "./route";

test("GET falls back to the bundled bank when WEFT_API_URL is unset", async () => {
  // bun runs the whole suite in one process, so another file's successful
  // fetch could otherwise leave a live bank memoised here.
  resetBankCache();
  delete process.env.WEFT_API_URL;

  const response = await GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("x-weft-bank-source")).toBe("fallback");
  const body = (await response.json()) as { questions: unknown[] };
  expect(body.questions).toHaveLength(20);
});
