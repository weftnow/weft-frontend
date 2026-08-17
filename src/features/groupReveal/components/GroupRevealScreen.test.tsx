import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { groupRevealMessages } from "../i18n/groupReveal.messages";
import type { GroupReveal } from "../schemas/groupReveal.schema";
import { GroupRevealView } from "./GroupRevealScreen";

const GROUP: GroupReveal = {
  group_index: 0,
  colour: "violet",
  confirmed: false,
  reveal_at: "2026-08-17T19:00:00+00:00",
  server_time: "2026-08-17T19:00:00+00:00",
  tablemates: [
    {
      display_name: "Valentina Ríos",
      company: "Nova",
      role: "Product Manager",
      profile: "Building user-centred products that solve real problems.",
      ref: "ref-1",
    },
    {
      display_name: "Andrés Martínez",
      company: null,
      role: "Co-founder",
      profile: "Passionate about AI, automation and scalable systems.",
      ref: "ref-2",
    },
  ],
};

function renderView(
  overrides: Partial<Parameters<typeof GroupRevealView>[0]> = {},
) {
  return renderToStaticMarkup(
    <GroupRevealView
      confirm={async () => true}
      confirmationError={false}
      confirming={false}
      error={null}
      group={undefined}
      messages={groupRevealMessages.en}
      onStartConversation={() => undefined}
      onRestartQuestionnaire={() => undefined}
      remaining={0}
      retry={async () => undefined}
      {...overrides}
    />,
  );
}

test("selects Weft's branded presentation for the group-waiting state", () => {
  const html = renderView();

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain("weave-loader-mark--spin");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft is preparing your group.");
  expect(html).toContain(
    "Keep this page open. Your table will appear here shortly.",
  );
});

test("presents temporary group failures in the branded questionnaire state", () => {
  const html = renderView({ error: "unavailable" });

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft questionnaire");
  expect(html).toContain("We couldn&#x27;t load your group right now.");
  expect(html).toContain("Your submitted answers are safe.");
  expect(html).toContain("Try again");
});

test("presents missing sessions with questionnaire recovery", () => {
  const html = renderView({ error: "no_session" });

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("We couldn&#x27;t find your saved session.");
  expect(html).toContain("Return to the questionnaire to continue.");
  expect(html).toContain("Return to questionnaire");
  expect(html).not.toContain("We couldn&#x27;t load your group right now.");
});

test("reveals the table with its number, colour and every tablemate", () => {
  const html = renderView({ group: GROUP });

  expect(html).toContain("Match found");
  expect(html).toContain("You&#x27;re all set!");
  expect(html).toContain("Group 1");
  expect(html).toContain("Violet group");
  expect(html).toContain("Valentina Ríos");
  expect(html).toContain("Product Manager at Nova");
  expect(html).toContain("Building user-centred products");
  expect(html).toContain("Sit with your group to begin.");
});

test("counts the viewer among the people at the table", () => {
  // Two tablemates in the payload plus the person reading it.
  expect(renderView({ group: GROUP })).toContain("3 people");
});

test("omits the company chip when a tablemate gave no company", () => {
  const html = renderView({ group: GROUP });

  expect(html).toContain("Co-founder</p>");
  expect(html).not.toContain("Co-founder at");
});

test("offers one button, whether or not the table is confirmed yet", () => {
  const unconfirmed = renderView({ group: GROUP });
  const confirmed = renderView({ group: { ...GROUP, confirmed: true } });

  for (const html of [unconfirmed, confirmed]) {
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain("Start guided conversations");
  }
});

test("keeps the reveal readable while the confirmation is in flight", () => {
  const html = renderView({ confirming: true, group: GROUP });

  expect(html).toContain("Starting…");
  expect(html).toContain("disabled=\"\"");
});

test("invites a second tap when the confirmation could not be recorded", () => {
  const html = renderView({ confirmationError: true, group: GROUP });

  expect(html).toContain('role="alert"');
  expect(html).toContain(
    "We couldn&#x27;t confirm your group. Tap again to continue anyway.",
  );
  expect(html).toContain("Start guided conversations");
});

test("counts down before the host's reveal moment", () => {
  const html = renderView({ group: GROUP, remaining: 4_200 });

  expect(html).toContain("Your circle appears in 5");
  expect(html).not.toContain("Start guided conversations");
});
