import type { PairPerson } from "@/lib/weftTypes";

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
