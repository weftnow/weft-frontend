import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PortraitStack } from "./PortraitStack";

const portraits = [
  {
    src: "/a.png",
    width: 100,
    height: 100,
    alt: "Portrait one",
    placeholder: true,
  },
  {
    src: "/b.png",
    width: 100,
    height: 100,
    alt: "Portrait two",
    placeholder: true,
  },
  {
    src: "/c.png",
    width: 100,
    height: 100,
    alt: "Portrait three",
    placeholder: true,
  },
] as const;

test("portrait stack exposes its collapsed disclosure state and all portraits", () => {
  const html = renderToStaticMarkup(<PortraitStack portraits={portraits} />);

  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Portrait one");
  expect(html).toContain("Portrait two");
  expect(html).toContain("Portrait three");
});
