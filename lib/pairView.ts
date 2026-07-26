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
/**
 * The band thresholds from weft_core's `report._BANDS`, paired with the share
 * of the meter each band ends at. Keep in step with that list: if a threshold
 * moves there and not here, the bar and the sentence stop agreeing.
 */
const BAND_ANCHORS: ReadonlyArray<readonly [score: number, percent: number]> = [
  [-1, 0],
  [-0.15, 20],
  [0.1, 40],
  [0.35, 60],
  [0.6, 80],
  [1, 100],
];

/**
 * The pair's score as a percentage a person can read.
 *
 * The backend sends its native -1..1 score, which is not calibrated against
 * any human population -- `0.15` is a perfectly ordinary result, but printed
 * as "15%" it reads as a failing grade. So this is not `score * 100`. It is a
 * piecewise-linear stretch through the band boundaries, giving each of the
 * five bands an equal fifth of the bar. The ordering of the underlying score
 * is preserved exactly; only the spacing changes, so the number makes no
 * claim the score didn't already make, and it can never contradict the band
 * sentence printed beside it.
 */
export function scorePercent(score: number): number {
  if (!Number.isFinite(score)) return 0;

  const [lowestScore, lowestPercent] = BAND_ANCHORS[0];
  const [highestScore, highestPercent] = BAND_ANCHORS[BAND_ANCHORS.length - 1];
  if (score <= lowestScore) return lowestPercent;
  if (score >= highestScore) return highestPercent;

  for (let i = 1; i < BAND_ANCHORS.length; i += 1) {
    const [upperScore, upperPercent] = BAND_ANCHORS[i];
    if (score > upperScore) continue;
    const [lowerScore, lowerPercent] = BAND_ANCHORS[i - 1];
    const fraction = (score - lowerScore) / (upperScore - lowerScore);
    return Math.round(lowerPercent + fraction * (upperPercent - lowerPercent));
  }

  return highestPercent;
}

export function personTraits(person: PairPerson, labels: TraitLabels): Trait[] {
  return [
    { label: labels.humour, value: person.humour },
    { label: labels.opensUp, value: person.opens_up },
    { label: labels.pace, value: person.pace },
    { label: labels.lifeStage, value: person.life_stage },
  ].filter((trait) => !UNMEASURED.has(trait.value.trim()));
}
