import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IntentChart } from "./IntentChart";

describe("IntentChart", () => {
  test("renders human labels, never backend keys", () => {
    const html = renderToStaticMarkup(
      <IntentChart
        asks={[{ value: "find_customers", count: 18 }]}
        offers={[{ value: "capital", count: 3 }]}
        language="en"
      />,
    );
    expect(html).toContain("Find customers");
    expect(html).not.toContain("find_customers");
    expect(html).toContain("Capital");
  });

  test("bars are sized relative to the largest count in their own list", () => {
    const html = renderToStaticMarkup(
      <IntentChart
        asks={[
          { value: "find_customers", count: 10 },
          { value: "hire_talent", count: 5 },
        ]}
        offers={[]}
        language="en"
      />,
    );
    expect(html).toContain("width:100%");
    expect(html).toContain("width:50%");
  });
});
