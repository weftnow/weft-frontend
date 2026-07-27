import { describe, expect, test } from "bun:test";
import { escapeApostrophes } from "./testEscape";

describe("escapeApostrophes", () => {
  test("escapes apostrophes the way renderToStaticMarkup does", () => {
    expect(escapeApostrophes("We can't find that.")).toBe("We can&#x27;t find that.");
  });

  test("escapes every apostrophe, not just the first", () => {
    expect(escapeApostrophes("don't, can't")).toBe("don&#x27;t, can&#x27;t");
  });

  test("leaves text with none of them alone", () => {
    expect(escapeApostrophes("Your compatibility")).toBe("Your compatibility");
  });

  test("throws on an ampersand rather than under-escaping it", () => {
    // The name says apostrophes. React also escapes & and <, and a helper
    // that quietly ignored them would make a wrong assertion pass.
    expect(() => escapeApostrophes("salt & pepper")).toThrow();
    expect(() => escapeApostrophes("a < b")).toThrow();
  });
});
