import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { content } from "@/content";
import { Turn } from "./Turn";

test("turn renders one accessible media set and one hidden looping duplicate", () => {
  const html = renderToStaticMarkup(<Turn />);

  expect(html).toMatch(/<div[^>]*data-turn-media-set="source"[^>]*>/);
  expect(html).toMatch(
    /<div[^>]*aria-hidden="true"[^>]*data-turn-media-set="duplicate"[^>]*>/,
  );
  // The rail is rendered twice -- once readable, once as the hidden loop --
  // so the card count follows the catalog rather than a pinned number.
  expect(html.match(/class="turn-media-card turn-media-card--/g)).toHaveLength(
    content.media.heroRail.length * 2,
  );
});
