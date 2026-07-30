import { describe, expect, test } from "bun:test";
import { inviteHref, pairHref, readShareParam } from "./links";

describe("inviteHref", () => {
  test("builds the friend landing path", () => {
    expect(inviteHref("tok-1")).toBe("/match/invite/tok-1");
  });

  test("encodes a token that would otherwise change the path", () => {
    expect(inviteHref("a/b?c")).toBe("/match/invite/a%2Fb%3Fc");
  });
});

describe("pairHref", () => {
  test("builds the result path", () => {
    expect(pairHref("p1")).toBe("/match/pair/p1");
  });

  test("carries a share token so the responder can invite onward", () => {
    expect(pairHref("p1", "tok-2")).toBe("/match/pair/p1?share=tok-2");
  });

  test("leaves the query off when there is no token to carry", () => {
    expect(pairHref("p1", "")).toBe("/match/pair/p1");
    expect(pairHref("p1", null)).toBe("/match/pair/p1");
  });

  test("encodes both halves", () => {
    expect(pairHref("p/1", "a&b")).toBe("/match/pair/p%2F1?share=a%26b");
  });
});

describe("readShareParam", () => {
  test("takes a single value", () => {
    expect(readShareParam("tok")).toBe("tok");
  });

  test("takes the first of a repeated query key", () => {
    expect(readShareParam(["tok", "other"])).toBe("tok");
  });

  test("treats absent and empty the same", () => {
    expect(readShareParam(undefined)).toBeNull();
    expect(readShareParam("")).toBeNull();
    expect(readShareParam([])).toBeNull();
  });
});
