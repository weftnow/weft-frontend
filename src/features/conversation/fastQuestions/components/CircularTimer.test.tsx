import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CircularTimer } from "./CircularTimer";

test("renders accessible non-live proportional progress", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} remainingMilliseconds={30_000} running />,
  );
  expect(html).toContain("00:30");
  expect(html).toContain("time left");
  expect(html).toContain('role="timer"');
  expect(html).not.toContain("aria-live");
  expect(html).toContain('data-progress="0.5"');
});
