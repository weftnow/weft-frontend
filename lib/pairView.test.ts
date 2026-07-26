import { describe, expect, test } from "bun:test";
import { personTraits } from "./pairView";
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
