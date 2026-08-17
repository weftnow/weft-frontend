import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomMap } from "./RoomMap";

describe("RoomMap", () => {
  test("renders a dot per member, filled when they found their table", () => {
    const html = renderToStaticMarkup(
      <RoomMap
        groups={[
          {
            index: 1,
            colour: "amber",
            members: [
              { display_name: null, confirmed: true },
              { display_name: null, confirmed: false },
            ],
          },
        ]}
      />,
    );
    expect(html.match(/data-confirmed="true"/g)?.length).toBe(1);
    expect(html.match(/data-confirmed="false"/g)?.length).toBe(1);
  });

  test("before matching runs, it says so rather than rendering an empty grid", () => {
    const html = renderToStaticMarkup(<RoomMap groups={[]} />);
    expect(html).toContain("No tables yet");
  });
});
