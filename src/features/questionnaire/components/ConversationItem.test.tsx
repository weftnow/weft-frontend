import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConversationItemView } from "./ConversationItem";

test("Weft and attendee items use distinct branded semantics", () => {
  const weft = renderToStaticMarkup(
    <ConversationItemView
      animate={false}
      item={{
        id: "q",
        type: "question",
        questionId: "reason",
        content: "Why are you here?",
      }}
    />,
  );
  const attendee = renderToStaticMarkup(
    <ConversationItemView
      animate={false}
      item={{
        id: "a",
        type: "answer",
        questionId: "reason",
        value: "connect",
        display: "Meet thoughtful people",
      }}
    />,
  );

  expect(weft).toContain('src="/icon.svg"');
  expect(weft).toContain("Weft says");
  expect(weft).toContain("Why are you here?");
  expect(attendee).toContain("Your answer");
  expect(attendee).toContain("Meet thoughtful people");
  expect(attendee).not.toContain('src="/icon.svg"');
});
