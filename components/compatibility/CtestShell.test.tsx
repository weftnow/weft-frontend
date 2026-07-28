import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CtestShell } from "./CtestShell";

test("questionnaire shell renders the weave only when requested", () => {
  const withWeave = renderToStaticMarkup(
    <CtestShell showWeave>
      <p>Question</p>
    </CtestShell>,
  );
  const withoutWeave = renderToStaticMarkup(
    <CtestShell>
      <p>Result</p>
    </CtestShell>,
  );

  expect(withWeave).toContain("ctest-weave");
  expect(withWeave).toContain('src="/icon.svg"');
  expect(withWeave).toContain('aria-hidden="true"');
  expect(withoutWeave).not.toContain("ctest-weave");
});

test("questionnaire shell keeps the minimal home control", () => {
  const html = renderToStaticMarkup(
    <CtestShell>
      <p>Page</p>
    </CtestShell>,
  );

  expect(html).toContain('href="/"');
  expect(html).toContain("ctest-home");
  expect(html).not.toContain("<nav");
});
