import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedPrompt } from "./AnimatedPrompt";
import { LanguageSelector } from "./LanguageSelector";

test("prompt renders one complete decorative string and addressable characters", () => {
  const html = renderToStaticMarkup(<AnimatedPrompt text="What's your role?" />);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('data-auth-character="true"');
  expect(html).toContain("What&#x27;s your role?");
});

test("language selector exposes a two-option radio group", () => {
  const html = renderToStaticMarkup(
    <LanguageSelector language="en" onChange={() => {}} />,
  );
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('aria-checked="true"');
  expect(html).toContain("English");
  expect(html).toContain("Español");
});
