import { describe, expect, test } from "bun:test";
import { personTraits, scorePercent } from "./pairView";
import type { PairPerson } from "./weftTypes";

const LABELS = {
  humour: "Humour",
  opensUp: "Opens up",
  pace: "Pace",
  lifeStage: "Life stage",
};

const PERSON: PairPerson = {
  name: "Ana",
  top_values: [],
  humour: "warm/affiliative",
  opens_up: "opens up quickly",
  pace: "likes a steady rhythm",
  life_stage: "rooting",
};

describe("personTraits", () => {
  test("lists every measured trait, labelled and in order", () => {
    expect(personTraits(PERSON, LABELS)).toEqual([
      { label: "Humour", value: "warm/affiliative" },
      { label: "Opens up", value: "opens up quickly" },
      { label: "Pace", value: "likes a steady rhythm" },
      { label: "Life stage", value: "rooting" },
    ]);
  });

  test("drops the em-dash the backend uses for unmeasured humour", () => {
    const traits = personTraits({ ...PERSON, humour: "—" }, LABELS);
    expect(traits).toHaveLength(3);
    expect(traits[0].label).toBe("Opens up");
  });

  test("drops an unspecified life stage", () => {
    const traits = personTraits({ ...PERSON, life_stage: "unspecified" }, LABELS);
    expect(traits).toHaveLength(3);
  });

  test("drops a blank the backend should not have sent", () => {
    expect(personTraits({ ...PERSON, pace: "   " }, LABELS)).toHaveLength(3);
  });

  test("a person we could not read at all has nothing to show", () => {
    const blank = {
      ...PERSON,
      humour: "—",
      opens_up: "",
      pace: "",
      life_stage: "unspecified",
    };
    expect(personTraits(blank, LABELS)).toEqual([]);
  });
});

describe("scorePercent", () => {
  test("puts every band boundary on a round twenty", () => {
    // These five numbers are weft_core's `_BANDS` thresholds. Each band owns
    // exactly one fifth of the bar, so the meter and the sentence beside it
    // can never disagree about which band you are in.
    expect(scorePercent(-1)).toBe(0);
    expect(scorePercent(-0.15)).toBe(20);
    expect(scorePercent(0.1)).toBe(40);
    expect(scorePercent(0.35)).toBe(60);
    expect(scorePercent(0.6)).toBe(80);
    expect(scorePercent(1)).toBe(100);
  });

  test("interpolates inside a band", () => {
    // halfway between 0.35 and 0.60 is halfway between 60% and 80%
    expect(scorePercent(0.475)).toBe(70);
    // the real backend scores from phase 1, now readable
    expect(scorePercent(0.9137)).toBe(96);
    expect(scorePercent(0.1544)).toBe(44);
    expect(scorePercent(0.0875)).toBe(39);
  });

  test("never leaves the bar", () => {
    // The engine is cosine-based so it cannot exceed -1..1, but a percentage
    // of 104 would paint outside the meter and there is no reason to risk it.
    expect(scorePercent(-4)).toBe(0);
    expect(scorePercent(4)).toBe(100);
    expect(scorePercent(Number.NaN)).toBe(0);
  });

  test("rises with the score and never falls", () => {
    let previous = -1;
    for (let score = -1; score <= 1.0001; score += 0.01) {
      const percent = scorePercent(score);
      expect(percent).toBeGreaterThanOrEqual(previous);
      previous = percent;
    }
  });

  test("is a whole number, because a meter reading 43.7% invites a question", () => {
    expect(Number.isInteger(scorePercent(0.4137))).toBe(true);
    expect(Number.isInteger(scorePercent(-0.0731))).toBe(true);
  });
});
