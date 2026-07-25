import { describe, expect, test } from "bun:test";
import { hasErrors, trimDetails, validateDetails } from "./details";

const VALID = { name: "Ada", email: "ada@example.com", phone: "+1 415 555 0100" };

describe("validateDetails", () => {
  test("accepts a complete set", () => {
    expect(validateDetails(VALID)).toEqual({});
  });

  test("requires a name that is not just spaces", () => {
    expect(validateDetails({ ...VALID, name: "   " }).name).toBeTruthy();
  });

  test("requires an email that could exist", () => {
    expect(validateDetails({ ...VALID, email: "" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "ada" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "ada@example" }).email).toBeTruthy();
    expect(validateDetails({ ...VALID, email: "a b@example.com" }).email).toBeTruthy();
  });

  test("requires enough digits to be a phone number", () => {
    expect(validateDetails({ ...VALID, phone: "" }).phone).toBeTruthy();
    expect(validateDetails({ ...VALID, phone: "12345" }).phone).toBeTruthy();
  });

  test("accepts phone numbers however they are punctuated", () => {
    // Nobody agrees on formatting, so only the digits are counted.
    for (const phone of ["+44 7700 900123", "(415) 555-0100", "0415.555.0100"]) {
      expect(validateDetails({ ...VALID, phone }).phone).toBeUndefined();
    }
  });

  test("reports every bad field at once", () => {
    const errors = validateDetails({ name: "", email: "", phone: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "phone"]);
  });
});

describe("trimDetails", () => {
  test("strips the whitespace the backend would reject", () => {
    expect(trimDetails({ name: " Ada ", email: " ada@example.com ", phone: " 415 555 0100 " })).toEqual({
      name: "Ada",
      email: "ada@example.com",
      phone: "415 555 0100",
    });
  });
});

describe("hasErrors", () => {
  test("is false only for an empty set", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ name: "Your name is required" })).toBe(true);
  });
});
