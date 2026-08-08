import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { FastQuestionsCompletion } from "./FastQuestionsCompletion";
import { ParticipantList } from "./ParticipantList";
import { QuestionDisplay } from "./QuestionDisplay";
import { RoundProgress } from "./RoundProgress";

const session = createMockFastQuestionsSession(
  "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c",
);

test("keeps the question as the primary heading", () => {
  const html = renderToStaticMarkup(<QuestionDisplay round={session.rounds[0]} />);
  expect(html).toContain("<h1");
  expect(html).toContain("What’s one thing you’re working on right now?");
});

test("marks exactly one active participant and preserves full names", () => {
  const html = renderToStaticMarkup(
    <ParticipantList activeParticipantId="antonio" participants={session.participants} />,
  );
  expect((html.match(/data-active="true"/g) ?? [])).toHaveLength(1);
  expect(html).toContain("Antonio, currently responding");
  expect(html).toContain("María");
});

test("renders three round indicators and current count", () => {
  const html = renderToStaticMarkup(<RoundProgress currentRoundIndex={1} />);
  expect((html.match(/data-round-indicator/g) ?? [])).toHaveLength(3);
  expect(html).toContain("2 of 3");
});

test("completion does not introduce Phase 2 content", () => {
  const html = renderToStaticMarkup(<FastQuestionsCompletion onContinue={() => {}} />);
  expect(html).toContain("Fast questions complete.");
  expect(html).toContain("Continue");
  expect(html).not.toContain("Shared Challenge");
});
