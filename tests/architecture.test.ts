import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("all application source lives under src", () => {
  expect(existsSync(resolve(projectRoot, "src/app/page.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/components/ui"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/lib"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "app"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "components"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "lib"))).toBe(false);
  expect(existsSync(resolve(projectRoot, "content.ts"))).toBe(false);
});

test("demo b2c owns its feature-specific source", () => {
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/demo-b2c/components/CompatibilityTest.tsx",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(projectRoot, "src/features/demo-b2c/model/compatibility.ts"),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(projectRoot, "src/features/demo-b2c/schemas/details.ts"),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(projectRoot, "src/features/demo-b2c/types/contracts.ts"),
    ),
  ).toBe(true);
  expect(
    existsSync(resolve(projectRoot, "src/features/demo-b2c/content.ts")),
  ).toBe(true);
  expect(
    existsSync(resolve(projectRoot, "src/components/compatibility")),
  ).toBe(false);
  expect(existsSync(resolve(projectRoot, "src/lib/compatibility.ts"))).toBe(
    false,
  );
  expect(existsSync(resolve(projectRoot, "src/lib/weftTypes.ts"))).toBe(false);
});

test("demo b2c owns feature API operations while transport stays shared", () => {
  expect(existsSync(resolve(projectRoot, "src/lib/api/weftApi.ts"))).toBe(
    true,
  );
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/demo-b2c/api/server/submitAnswers.ts",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/demo-b2c/api/client/submitAnswers.ts",
      ),
    ),
  ).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/lib/server"))).toBe(false);
});

test("attendee questionnaire owns a feature-based route and api boundary", () => {
  expect(
    existsSync(resolve(projectRoot, "src/app/questionnaire/page.tsx")),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/questionnaire/components/Questionnaire.tsx",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/questionnaire/api/questionnaire.api.ts",
      ),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/features/questionnaire/hooks/useQuestionnaire.ts",
      ),
    ),
  ).toBe(true);
  // The B2B event form is same-origin proxied through narrowly scoped route
  // handlers (never a generic passthrough), so this directory existing is
  // intentional — unlike demo-b2c, which never needs its own routes.
  expect(
    existsSync(
      resolve(projectRoot, "src/app/api/questionnaire/[formToken]/route.ts"),
    ),
  ).toBe(true);
  expect(
    existsSync(
      resolve(
        projectRoot,
        "src/app/api/questionnaire/[formToken]/submit/route.ts",
      ),
    ),
  ).toBe(true);
});
