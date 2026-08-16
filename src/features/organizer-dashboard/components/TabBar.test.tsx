import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
  test("a free organizer sees the paid tabs, marked as locked", () => {
    const html = renderToStaticMarkup(
      <TabBar eventId="e1" active="overview" plan="free" />,
    );
    expect(html).toContain("Attendees");
    expect(html).toContain('data-locked="true"');
  });

  test("a pro organizer gets real links to every tab", () => {
    const html = renderToStaticMarkup(
      <TabBar eventId="e1" active="overview" plan="pro" />,
    );
    expect(html).toContain("/organizer/events/e1/attendees");
    expect(html).not.toContain('data-locked="true"');
  });

  test("the free tabs are always real links, whatever the plan", () => {
    const html = renderToStaticMarkup(
      <TabBar eventId="e1" active="overview" plan="free" />,
    );
    expect(html).toContain("/organizer/events/e1/overview");
    expect(html).toContain("/organizer/events/e1/live");
  });
});
