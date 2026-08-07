import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailsForm } from "./DetailsForm";
import { demoB2cContent } from "@/features/demo-b2c/content";
import { EMPTY_DETAILS } from "@/features/demo-b2c/schemas/details";

const noop = () => {};

test("details form asks for every field the backend requires", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      initialDetails={EMPTY_DETAILS}
      busy={false}
      submitError={null}
      onBack={noop}
      onSubmit={noop}
    />,
  );
  expect(html).toContain(demoB2cContent.details.fields.name);
  expect(html).toContain(demoB2cContent.details.fields.email);
  expect(html).toContain(demoB2cContent.details.fields.phone);
  expect(html).toContain(demoB2cContent.details.cta);
});

test("details form uses the right input types and autocomplete hints", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      initialDetails={EMPTY_DETAILS}
      busy={false}
      submitError={null}
      onBack={noop}
      onSubmit={noop}
    />,
  );
  expect(html).toContain('type="email"');
  expect(html).toContain('type="tel"');
  expect(html).toContain('autoComplete="name"');
});

test("details form shows a submit failure where it can be read", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      initialDetails={EMPTY_DETAILS}
      busy={false}
      submitError="Backend said no"
      onBack={noop}
      onSubmit={noop}
    />,
  );
  expect(html).toContain("Backend said no");
  expect(html).toContain('role="alert"');
});

test("details form renders a seeded value in its fields", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      initialDetails={{ name: "Ada Lovelace", email: "ada@example.test", phone: "" }}
      busy={false}
      submitError={null}
      onBack={noop}
      onSubmit={noop}
    />,
  );
  expect(html).toContain('value="Ada Lovelace"');
  expect(html).toContain('value="ada@example.test"');
});

test("the fields sit under the rule-tick label like every other section", () => {
  const html = renderToStaticMarkup(
    <DetailsForm busy={false} initialDetails={EMPTY_DETAILS} onBack={() => {}} onSubmit={() => {}} submitError={null} />,
  );
  expect(html).toContain("ctest-rule");
  expect(html).toContain(demoB2cContent.details.fieldsLabel);
});

test("details actions keep Back before the primary submit action", () => {
  const html = renderToStaticMarkup(
    <DetailsForm
      busy={false}
      initialDetails={EMPTY_DETAILS}
      onBack={() => {}}
      onSubmit={() => {}}
      submitError={null}
    />,
  );

  expect(html).toContain("ctest-actions--details");
  expect(html.indexOf(demoB2cContent.details.back)).toBeLessThan(
    html.indexOf(`aria-label="${demoB2cContent.details.cta}`),
  );
});
