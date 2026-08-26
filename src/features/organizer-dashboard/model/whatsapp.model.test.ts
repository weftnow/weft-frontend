import { expect, test } from "bun:test";
import { attendeeLinkUrl, waMeUrl } from "./whatsapp.model";

test("the link is built against the dashboard's own origin", () => {
  expect(attendeeLinkUrl("https://app.weft.now", "abc")).toBe("https://app.weft.now/l/abc");
});

test("wa.me wants the number without its plus or its spaces", () => {
  expect(waMeUrl("+60 12-345 6789", "https://app.weft.now/l/abc")).toContain(
    "https://wa.me/60123456789?text=",
  );
});

test("a number that is not international gets no button rather than a wrong chat", () => {
  expect(waMeUrl("0123456789", "https://x/l/a")).toBeNull();
  expect(waMeUrl(null, "https://x/l/a")).toBeNull();
});
