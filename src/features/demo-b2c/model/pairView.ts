import type { PairPerson } from "@/features/demo-b2c/types/contracts";

export type Trait = { label: string; value: string };

export type TraitLabels = {
  humour: string;
  opensUp: string;
  pace: string;
  lifeStage: string;
};

/**
 * What the backend sends when it could not read a trait. `"—"` is the literal
 * em-dash `_tidy()` falls back to for humour; `"unspecified"` is the life-stage
 * equivalent.
 */
const UNMEASURED = new Set(["—", "unspecified", ""]);

/**
 * The descriptive lines for one person, with the blanks dropped. Printing
 * "Humour —" reads like a rendering bug, so an unmeasured trait is simply not
 * shown.
 */

export function personTraits(person: PairPerson, labels: TraitLabels): Trait[] {
  return [
    { label: labels.humour, value: person.humour },
    { label: labels.opensUp, value: person.opens_up },
    { label: labels.pace, value: person.pace },
    { label: labels.lifeStage, value: person.life_stage },
  ].filter((trait) => !UNMEASURED.has(trait.value.trim()));
}

export type TraitRow = { label: string; left: string | null; right: string | null };

/**
 * One row per trait dimension, both people's phrasing side by side. An
 * unmeasured side is null (the view prints a dash); a dimension neither
 * person measured is omitted -- a row of two dashes says nothing.
 */
export function pairTraitRows(
  [left, right]: readonly [PairPerson, PairPerson],
  labels: TraitLabels,
): TraitRow[] {
  const read = (person: PairPerson, pick: (p: PairPerson) => string): string | null => {
    const value = pick(person).trim();
    return UNMEASURED.has(value) ? null : value;
  };
  const dimensions: ReadonlyArray<[string, (p: PairPerson) => string]> = [
    [labels.humour, (p) => p.humour],
    [labels.opensUp, (p) => p.opens_up],
    [labels.pace, (p) => p.pace],
    [labels.lifeStage, (p) => p.life_stage],
  ];
  return dimensions
    .map(([label, pick]) => ({ label, left: read(left, pick), right: read(right, pick) }))
    .filter((row) => row.left !== null || row.right !== null);
}

/** Value keys the two people hold in common -- the crossings worth marking. */
export function sharedTopValueKeys([left, right]: readonly [PairPerson, PairPerson]): Set<string> {
  const rightKeys = new Set(right.top_values.map((value) => value.key));
  return new Set(
    left.top_values.filter((value) => rightKeys.has(value.key)).map((value) => value.key),
  );
}
