import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import GroupPage, { dynamic, metadata } from "./page";

test("group page is dynamic, private, and rejects invalid links", async () => {
  expect(dynamic).toBe("force-dynamic");
  expect(metadata.robots).toEqual({ index: false, follow: false });
  const html = renderToStaticMarkup(await GroupPage({ params: Promise.resolve({ formToken: "short" }) }));
  expect(html).toContain("This session link is invalid.");
});
