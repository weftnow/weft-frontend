import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage, { metadata } from "./page";

test("login page is private and keeps both credentials together", () => {
  const html = renderToStaticMarkup(<LoginPage />);
  expect(html).toContain('type="email"');
  expect(html).toContain('type="password"');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
