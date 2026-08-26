import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AttendeeTable } from "./AttendeeTable";

const ROW = {
  display_name: "Ana",
  email: "ana@x.co",
  phone: null,
  checked_in: true,
  submitted_at: "2026-08-21T19:00:00Z",
  link_token: "lt",
  answers: { company: "Fintech SA", t1: "raise a seed round for my fintech" },
};

describe("AttendeeTable", () => {
  test("leads each person with what they came to do", () => {
    const html = renderToStaticMarkup(<AttendeeTable rows={[ROW]} />);
    expect(html).toContain("Ana");
    expect(html).toContain("raise a seed round for my fintech");
    expect(html).toContain("Fintech SA");
  });

  test("someone who never checked in is visibly marked, not hidden", () => {
    const html = renderToStaticMarkup(
      <AttendeeTable rows={[{ ...ROW, checked_in: false }]} />,
    );
    expect(html).toContain('data-checked-in="false"');
  });
});
