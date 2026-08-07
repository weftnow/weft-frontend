import { demoB2cContent } from "@/features/demo-b2c/content";
import { SectionHead } from "./SectionHead";

/** The one honest sentence about friction, given room instead of a card. */
export function DifferencePull({ difference }: { difference: string }) {
  const copy = demoB2cContent.pair;

  return (
    <section className="ctest-section">
      <SectionHead label={copy.differenceLabel} />
      <p className="ctest-pull">{difference}</p>
    </section>
  );
}
