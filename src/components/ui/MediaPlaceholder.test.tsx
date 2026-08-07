import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MediaPlaceholder, type MediaAsset } from "./MediaPlaceholder";

const video: MediaAsset = {
  src: "/placeholders/weft/video1.mp4",
  width: 1080,
  height: 1350,
  alt: "Sample testimonial clip",
  placeholder: false,
  type: "video",
};

test("video autoplays, loops, and mutes by default", () => {
  const html = renderToStaticMarkup(<MediaPlaceholder media={video} sizes="100vw" />);
  expect(html).toContain('autoPlay=""');
  expect(html).toContain('loop=""');
  expect(html).toContain('muted=""');
  expect(html.includes('controls=""')).toBe(false);
});

test("controls prop swaps to click-to-play with native controls", () => {
  const html = renderToStaticMarkup(<MediaPlaceholder controls media={video} sizes="100vw" />);
  expect(html).toContain('controls=""');
  expect(html.includes('autoPlay=""')).toBe(false);
  expect(html.includes('loop=""')).toBe(false);
  expect(html.includes('muted=""')).toBe(false);
});
