import { describe, expect, test } from "bun:test";
import { displayName, withName } from "./inviteText";

describe("displayName", () => {
  test("passes an ordinary name through", () => {
    expect(displayName("Ana")).toBe("Ana");
  });

  test("tidies the whitespace a form leaves behind", () => {
    expect(displayName("  Ana   Maria  ")).toBe("Ana Maria");
  });

  test("caps a name that would swallow the headline", () => {
    const long = displayName("A".repeat(80));
    expect(long.length).toBe(32);
    expect(long.endsWith("…")).toBe(true);
  });

  test("falls back rather than addressing nobody", () => {
    expect(displayName("   ")).toBe("Someone");
  });
});

describe("withName", () => {
  test("fills every slot in the template", () => {
    expect(withName("{name} invited you, {name}", "Ana")).toBe(
      "Ana invited you, Ana",
    );
  });

  test("uses the tidied name", () => {
    expect(withName("From {name}.", "  Ben ")).toBe("From Ben.");
  });
});
