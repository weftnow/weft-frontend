import { describe, expect, test } from "bun:test";
import { acceptsResponses, landingTab, readiness } from "./eventState.model";

describe("acceptsResponses", () => {
  test("an open event is the only one still worth sharing a link for", () => {
    expect(acceptsResponses("open")).toBe(true);
  });

  test("everything past the lock has stopped taking submissions", () => {
    // "Share this with your guests" on an event that already ran is an
    // instruction that no longer works — the form turns them away.
    for (const state of ["locked", "published", "live", "closed", "learned"] as const) {
      expect(acceptsResponses(state)).toBe(false);
    }
  });
});

describe("landingTab", () => {
  test("a running event opens on Live, because that is the screen in use", () => {
    expect(landingTab("published")).toBe("live");
    expect(landingTab("live")).toBe("live");
    expect(landingTab("locked")).toBe("live");
  });

  test("a finished or unstarted event opens on Overview", () => {
    expect(landingTab("open")).toBe("overview");
    expect(landingTab("closed")).toBe("overview");
    expect(landingTab("learned")).toBe("overview");
  });
});

describe("readiness", () => {
  test("marks each step done as the event progresses", () => {
    // "live", not "published": the backend's published state means matching
    // finished but the host has not revealed yet (app/services/events.py
    // transitions published -> live on reveal), so the last step is still
    // outstanding there.
    const steps = readiness({ submitted: 12, groups: 3 }, "live");
    expect(steps.map((s) => s.key)).toEqual(["form", "responses", "matched", "revealed"]);
    expect(steps.every((s) => s.done)).toBe(true);
  });

  test("a matched but unrevealed event still has the reveal step outstanding", () => {
    const steps = readiness({ submitted: 12, groups: 3 }, "published");
    expect(steps.find((s) => s.key === "matched")?.done).toBe(true);
    expect(steps.find((s) => s.key === "revealed")?.done).toBe(false);
  });

  test("an open event with no responses has only the form step done", () => {
    const steps = readiness({ submitted: 0, groups: 0 }, "open");
    expect(steps.find((s) => s.key === "form")?.done).toBe(true);
    expect(steps.find((s) => s.key === "responses")?.done).toBe(false);
    expect(steps.find((s) => s.key === "matched")?.done).toBe(false);
  });
});
