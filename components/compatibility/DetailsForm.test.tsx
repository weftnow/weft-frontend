import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailsForm } from "./DetailsForm";
import { content } from "@/content";

const noop = () => {};

test("details form asks for every field the backend requires", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError={null} onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain(content.compatibilityTest.details.fields.name);
  expect(html).toContain(content.compatibilityTest.details.fields.email);
  expect(html).toContain(content.compatibilityTest.details.fields.phone);
  expect(html).toContain(content.compatibilityTest.details.cta);
});

test("details form uses the right input types and autocomplete hints", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError={null} onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain('type="email"');
  expect(html).toContain('type="tel"');
  expect(html).toContain('autoComplete="name"');
});

test("details form shows a submit failure where it can be read", () => {
  const html = renderToStaticMarkup(
    <DetailsForm submitError="Backend said no" onBack={noop} onSubmit={noop} />,
  );
  expect(html).toContain("Backend said no");
  expect(html).toContain('role="alert"');
});
