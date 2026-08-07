import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RevealText } from "./RevealText";

test("reveal text renders each heading phrase as one grouped line", () => {
  const html = renderToStaticMarkup(
    <RevealText
      lines={[{ text: "One deliberate phrase", muted: "with one quiet turn." }]}
    />,
  );

  expect(html).toContain("One deliberate phrase");
  expect(html).toContain('<span class="text-ash"> with one quiet turn.</span>');
  expect(html.includes("margin-right")).toBe(false);
});
