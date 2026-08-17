import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BonusIntros } from "./BonusIntros";

describe("BonusIntros", () => {
  test("names both people in each pair and offers a tick", () => {
    const html = renderToStaticMarkup(
      <BonusIntros pairs={[{ person_a: "Ana", person_b: "Julio", strength: "good" }]} />,
    );
    expect(html).toContain("Ana");
    expect(html).toContain("Julio");
    expect(html).toContain('type="checkbox"');
  });

  test("an event with no leftover pairs says so rather than showing an empty list", () => {
    const html = renderToStaticMarkup(<BonusIntros pairs={[]} />);
    expect(html).toContain("No bonus introductions");
  });
});
