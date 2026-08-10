import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import RegisterPage, { metadata } from "./page";

test("registration page is private and composes the registration flow", () => {
  const html = renderToStaticMarkup(<RegisterPage />);
  expect(html).toContain("What should we call you?");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
