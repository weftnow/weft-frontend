/**
 * The three things weft_core requires before it will accept a submission.
 * Validated here so a missing field is an inline message rather than a
 * round-trip and a 400.
 */
export type Details = { name: string; email: string; phone: string };

export type DetailsErrors = Partial<Record<keyof Details, string>>;

/** Deliberately loose: enough shape to catch a typo, not a spec of RFC 5322. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The shortest real national numbers are 7 digits. */
const MIN_PHONE_DIGITS = 7;

export function trimDetails(details: Details): Details {
  return {
    name: details.name.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
  };
}

export function validateDetails(details: Details): DetailsErrors {
  const { name, email, phone } = trimDetails(details);
  const errors: DetailsErrors = {};

  if (name === "") errors.name = "Your name is required.";
  if (!EMAIL.test(email)) errors.email = "Enter an email address we can reach you at.";
  // Formatting varies by country, so only the digits are counted.
  if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) {
    errors.phone = "Enter a phone number, including the country code.";
  }

  return errors;
}

export function hasErrors(errors: DetailsErrors): boolean {
  return Object.keys(errors).length > 0;
}
