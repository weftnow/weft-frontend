import { expect, test } from "bun:test";
import { FastQuestionsApiError } from "../fastQuestions/api/fastQuestions.api";
import { noticeStatusFor } from "./ConversationRouter";

/**
 * A guest follows the link straight off the questionnaire, often long before
 * the host starts anything. That arrival must not read as breakage — the
 * screen keeps polling underneath, so there is nothing for them to retry.
 */
test("an unstarted session reads as waiting, not as an error", () => {
  expect(noticeStatusFor(new FastQuestionsApiError(404, "no_session"))).toBe("notStarted");
});

/**
 * The opposite arrival: someone who filled the form but was never checked in
 * before the host locked the room. Nothing seats them now, so "keep waiting"
 * is the one thing this screen must not say to them.
 */
test("a guest who was never seated gets a terminal screen, not the waiting one", () => {
  expect(noticeStatusFor(new FastQuestionsApiError(409, "too_late"))).toBe("tooLate");
});

test("a device that never filled the form gets the invalid-link screen", () => {
  expect(noticeStatusFor(new FastQuestionsApiError(401, "no_attendee_token"))).toBe("invalid");
});

test("everything else stays a retryable sync error", () => {
  expect(noticeStatusFor(new FastQuestionsApiError(503, "unavailable"))).toBe("error");
  expect(noticeStatusFor(new Error("boom"))).toBe("error");
  expect(noticeStatusFor(null)).toBe("error");
});
