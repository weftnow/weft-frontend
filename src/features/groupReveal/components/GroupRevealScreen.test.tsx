import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { groupRevealMessages } from "../i18n/groupReveal.messages";
import { GroupRevealView } from "./GroupRevealScreen";

test("selects Weft's branded presentation for the group-waiting state", () => {
  const html = renderToStaticMarkup(
    <GroupRevealView
      confirm={async () => undefined}
      confirmationError={false}
      confirming={false}
      error={false}
      group={undefined}
      messages={groupRevealMessages.en}
      onStartConversation={() => undefined}
      remaining={0}
      retry={async () => undefined}
    />,
  );

  expect(html).toContain("questionnaire-shell questionnaire-state");
  expect(html).toContain("weave-loader-mark--spin");
  expect(html).toContain('src="/icon.svg"');
  expect(html).toContain("Weft is preparing your group.");
  expect(html).toContain(
    "Keep this page open. Your table will appear here shortly.",
  );
});
