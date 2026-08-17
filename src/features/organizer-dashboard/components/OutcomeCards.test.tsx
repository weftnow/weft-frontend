import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OutcomeCards } from "./OutcomeCards";

describe("OutcomeCards", () => {
  test("shows mutual reconnects as the hero and always names the denominator", () => {
    const html = renderToStaticMarkup(
      <OutcomeCards
        outcomes={{
          responders: 34,
          selected_someone: 31,
          mutual_pairs: 21,
          per_table: [{ index: 1, mutual: 3 }],
        }}
      />,
    );
    expect(html).toContain("21");
    expect(html).toContain("31");
    expect(html).toContain("34");
  });

  test("no feedback yet reads as waiting, not as zero success", () => {
    const html = renderToStaticMarkup(
      <OutcomeCards
        outcomes={{ responders: 0, selected_someone: 0, mutual_pairs: 0, per_table: [] }}
      />,
    );
    expect(html).toContain("No feedback yet");
  });
});
