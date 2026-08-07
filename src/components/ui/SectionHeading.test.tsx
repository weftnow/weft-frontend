import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionHeading } from "./SectionHeading";

test("section heading preserves whitespace when its lines flow inline", () => {
  const html = renderToStaticMarkup(
    <SectionHeading
      as="h1"
      lines={[
        { text: "In this room.", muted: "" },
        { text: "You will meet", muted: "someone new." },
      ]}
    />,
  );

  expect(html).toContain("In this room. </span><span");
});
