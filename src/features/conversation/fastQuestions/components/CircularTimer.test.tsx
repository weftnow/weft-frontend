import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { messagesFor } from "../../i18n/conversation.messages";
import { CircularTimer } from "./CircularTimer";

const messages = messagesFor("en");

const styles = await readFile(
  new URL("./CircularTimer.module.css", import.meta.url),
  "utf8",
);

test("renders accessible non-live proportional progress", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} messages={messages} remainingMilliseconds={30_000} running />,
  );
  expect(html).toContain("00:30");
  expect(html).toContain("time left");
  expect(html).toContain('role="timer"');
  expect(html).not.toContain("aria-live");
  expect(html).toContain('data-progress="0.5"');
});

test("transitions the ember marker in lockstep with the countdown arc", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} messages={messages} remainingMilliseconds={30_000} running />,
  );

  expect(html).toContain('data-progress-marker="true"');
  expect(html).toContain('data-progress-marker-motion="true"');
  expect(styles).toMatch(/\.endpoint\s*\{[\s\S]*?fill:\s*var\(--color-ember\)/);
  expect(styles).toMatch(
    /\.endpointMotionRunning\s*\{[\s\S]*?transition:\s*transform\s+1s\s+linear/,
  );
});

test("clamps the visible readout to the round duration during the reading gap", () => {
  // The caller passes turn_ends_at - now during the reading gap, which is
  // duration + the gap length. The readout must not tick through that extra
  // time — it has to agree with the ring (already clamped) and the
  // aria-label, or a sighted user and a screen-reader user see different
  // numbers for the same instant.
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={30} messages={messages} remainingMilliseconds={38_000} running={false} />,
  );
  expect(html).toContain("00:30");
  expect(html).not.toContain("00:38");
});

test("fills its responsive parent as the countdown surface", () => {
  expect(styles).toMatch(
    /\.circularTimer\s*\{(?=[^}]*display:\s*grid;)(?=[^}]*width:\s*100%;)(?=[^}]*height:\s*100%;)[^}]*\}/s,
  );
});
