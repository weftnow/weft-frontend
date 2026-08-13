import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { groupRevealMessages } from "../i18n/groupReveal.messages";
import { GroupRevealView } from "./GroupRevealScreen";

function renderView(error: "no_session" | "unavailable" | null) {
  return renderToStaticMarkup(
    <GroupRevealView
      confirm={async () => undefined}
      confirmationError={false}
      confirming={false}
      error={error}
      group={undefined}
      messages={groupRevealMessages.en}
      onStartConversation={() => undefined}
      onRestartQuestionnaire={() => undefined}
      remaining={0}
      retry={async () => undefined}
    />,
  );
}

test("selects Weft's branded presentation for the group-waiting state", () => {
  const html = renderView(null);

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain("weave-loader-mark--spin");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft is preparing your group.");
  expect(html).toContain(
    "Keep this page open. Your table will appear here shortly.",
  );
});

test("presents temporary group failures in the branded questionnaire state", () => {
  const html = renderView("unavailable");

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft questionnaire");
  expect(html).toContain("We couldn&#x27;t load your group right now.");
  expect(html).toContain("Your submitted answers are safe.");
  expect(html).toContain("Try again");
});

test("presents missing sessions with questionnaire recovery", () => {
  const html = renderView("no_session");

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft questionnaire");
  expect(html).toContain("We couldn&#x27;t find your saved session.");
  expect(html).toContain("Return to the questionnaire to continue.");
  expect(html).toContain("Return to questionnaire");
  expect(html).not.toContain("We couldn&#x27;t load your group right now.");
});
