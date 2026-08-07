import { describe, expect, test } from "bun:test";
import { personTraits, pairTraitRows, sharedTopValueKeys } from "./pairView";
import type { PairPerson } from "../types/contracts";

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

describe("pairTraitRows and sharedTopValueKeys", () => {
  const VALUE = { key: "BE", name: "Benevolence", tagline: "care up close", blurb: "b" };
  const OTHER = { key: "TR", name: "Tradition", tagline: "continuity", blurb: "b" };

  function person(overrides: Partial<PairPerson>): PairPerson {
    return {
      name: "P",
      top_values: [VALUE],
      humour: "warm/affiliative",
      opens_up: "opens up quickly",
      pace: "likes a steady rhythm",
      life_stage: "rooting",
      ...overrides,
    };
  }

  test("pairTraitRows pairs both people's phrasing per dimension, in label order", () => {
    const rows = pairTraitRows([person({}), person({ pace: "likes space between" })], LABELS);
    expect(rows.map((r) => r.label)).toEqual(["Humour", "Opens up", "Pace", "Life stage"]);
    expect(rows[2]).toEqual({ label: "Pace", left: "likes a steady rhythm", right: "likes space between" });
  });

  test("a dimension unmeasured on one side is null there, not dropped", () => {
    const rows = pairTraitRows([person({}), person({ humour: "—" })], LABELS);
    expect(rows[0]).toEqual({ label: "Humour", left: "warm/affiliative", right: null });
  });

  test("a dimension unmeasured on both sides is omitted entirely", () => {
    const rows = pairTraitRows([person({ humour: "—" }), person({ humour: "unspecified" })], LABELS);
    expect(rows.map((r) => r.label)).not.toContain("Humour");
  });

  test("sharedTopValueKeys is the intersection of both value lists", () => {
    const keys = sharedTopValueKeys([person({ top_values: [VALUE, OTHER] }), person({ top_values: [VALUE] })]);
    expect(keys.has("BE")).toBe(true);
    expect(keys.has("TR")).toBe(false);
  });
});
