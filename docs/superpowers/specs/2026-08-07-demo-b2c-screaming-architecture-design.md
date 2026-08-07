# Demo B2C Screaming Architecture Design

## Objective

Reorganize the entire application under `src/` and make the existing compatibility-test experience read as a single `demo-b2c` feature. Preserve all current URLs, behavior, styling, API contracts, and error handling while replacing technical-layer ownership with explicit feature ownership.

## Scope

This migration covers all current application code in root-level `app/`, `components/`, `lib/`, and `content.ts`. It does not redesign the interface, change questionnaire behavior, rename public routes, add a new `/questionnaire/[eventId]` route, or change the upstream Weft API.

The current compatibility flow includes:

- the questionnaire and details collection;
- invitation handling;
- answer submission and session cookies;
- match listing and invite reminting;
- pair-result rendering;
- fallback question-bank behavior;
- compatibility-specific copy, validation, types, and pure domain rules.

All of these belong to `demo-b2c`.

## Architecture

The application will use a feature-first vertical slice with thin Next.js route adapters:

```text
src/
  app/
    api/
      answers/route.ts
      bank/route.ts
      invite/route.ts
    compatibility-test/
      invite/[token]/page.tsx
      matches/page.tsx
      pair/[id]/page.tsx
      page.tsx
    visual-pair-preview/page.tsx
    icon.png
    layout.tsx
    page.tsx

  features/
    demo-b2c/
      api/
        client/
        server/
      components/
        pair/
      content.ts
      data/
      model/
      schemas/
      types/

  components/
    sections/
    ui/

  lib/
    api/
    analytics/

  content.ts
  styles/
    globals.css
```

Only directories that own real code will be created. In particular, `hooks/` is intentionally deferred until a genuinely reusable feature hook exists; the migration will not extract state from the questionnaire merely to populate a folder.

### Ownership rules

- `src/app/` owns routing conventions, metadata, route parameters, cookie/request integration, and composition of feature entry points.
- `src/features/demo-b2c/` owns every module that would change specifically because the compatibility experience changes.
- `src/components/ui/` owns reusable presentation primitives with no demo-b2c knowledge.
- `src/components/sections/` owns the existing homepage sections. Introducing a separate marketing feature is outside this migration.
- `src/lib/api/` owns only feature-neutral HTTP infrastructure and upstream transport concerns.
- `src/lib/analytics/` is created only when shared analytics code exists.
- `src/content.ts` owns homepage copy; `src/features/demo-b2c/content.ts` owns compatibility-flow copy.
- Fallback questionnaire data belongs under `src/features/demo-b2c/data/`.

Dependencies flow in one direction:

```text
src/app  ->  src/features/demo-b2c  ->  shared src/components and src/lib
```

Shared code must not import from `demo-b2c`, and feature code must not import from `src/app`. Route files import explicit feature modules rather than a broad barrel file, which avoids accidentally mixing client and server modules.

## Feature Module Responsibilities

### Components

All files currently under `components/compatibility/` move to `src/features/demo-b2c/components/`. The existing `pair/` subgroup remains a focused component subgroup. The questionnaire component initially moves intact so this structural migration does not introduce an unrelated state-management rewrite.

### Model

Pure compatibility rules move from the root `lib/` into `src/features/demo-b2c/model/`. This includes questionnaire transitions and selection rules, answer transformation, invite text, feature URLs, pair-view derivation, and submission-outcome decisions. These modules remain deterministic and framework-independent.

### Schemas and Types

Details validation, normalization, and upstream payload guards belong to `schemas/`. Feature contracts currently represented by `weftTypes.ts` belong to `types/`. The split separates validation at boundaries from the data shapes used after validation.

### API

Feature-specific browser calls to local route handlers live under `api/client/`. Feature-specific server operations for the bank, invite, pair, matches, answer submission, and invite minting live under `api/server/`. The configured generic upstream fetch implementation lives under `src/lib/api/` because it is transport infrastructure rather than demo behavior.

Server modules must remain outside client dependency paths. Moving files must not expose the upstream base URL or proxy key to browser bundles.

## Routing and Public Behavior

The migration preserves these public endpoints exactly:

- `/`
- `/compatibility-test`
- `/compatibility-test/invite/[token]`
- `/compatibility-test/matches`
- `/compatibility-test/pair/[id]`
- `/visual-pair-preview`
- `/api/answers`
- `/api/bank`
- `/api/invite`

Moving the root `app/` directory to `src/app/` is supported by Next.js 16.2.11. The root-level `app/` directory must no longer remain because Next.js ignores `src/app/` when a root `app/` is present. The TypeScript alias `@/*` will resolve to `src/*`.

Route modules remain thin. They may:

- export metadata and route configuration;
- read route parameters, query parameters, requests, and cookies;
- call a feature server operation;
- map its outcome to a feature screen or HTTP response.

They do not own feature rules or upstream payload contracts.

## Data and Error Flow

The data flow remains unchanged:

1. Server pages load question, invite, match, or pair data through demo-b2c server API modules.
2. Those modules use the shared configured HTTP client to reach the upstream service.
3. Validated feature contracts are passed into feature components.
4. Browser writes target the existing local `/api/*` endpoints.
5. Route handlers call demo-b2c server modules and preserve current status/body mappings.

The migration preserves all existing behavior for unavailable upstream services, expired or unknown invitations, missing pair results, missing sessions, incomplete answers, browser submission timeouts, stranded redirects, and fallback question-bank loading. Session cookie flags and lifetime remain unchanged.

## Content and Styling

The current combined `content.ts` is split by ownership without changing copy. Homepage sections continue importing homepage content from `src/content.ts`. Demo-b2c components and routes import compatibility copy from `src/features/demo-b2c/content.ts`.

Global CSS moves to `src/styles/globals.css`, and `src/app/layout.tsx` imports it. Class names and declarations remain unchanged, keeping the migration behavior-neutral.

## Testing and Verification

The migration follows a test-first structural cycle:

1. Add an architecture contract test that fails while feature-owned compatibility code remains in root technical-layer folders or required route entry points are outside `src/app/`.
2. Move source and colocated tests in coherent slices, updating imports after each slice.
3. Keep the architecture test green as old locations disappear.
4. Run the relocated unit, component, interaction, route, and API tests without weakening assertions.
5. Run the full Bun test suite, ESLint, TypeScript checking, and a production Next.js build.

The architecture test protects the primary intent of this work: future compatibility code should have an obvious feature-owned home. Existing behavioral tests protect the promise that this is an organizational migration rather than a product change.

## Migration Constraints

- Preserve all existing public URLs and request/response contracts.
- Preserve all current UI behavior, styles, metadata, cookies, timeouts, and fallback behavior.
- Move all application code under `src/`.
- Do not leave compatibility re-export shims in the old root-level folders.
- Do not create empty ceremonial directories.
- Do not perform unrelated homepage or questionnaire refactors.
- Preserve untracked and unrelated user-owned workspace changes.

## Success Criteria

- The source tree communicates `demo-b2c` as the owner of the full compatibility experience.
- Next.js routes remain thin and all existing URLs resolve as before.
- No compatibility-specific production code remains in root `components/` or root `lib/` locations.
- The `@/*` alias consistently resolves from `src/`.
- No server secret or server-only module enters a client import path.
- Architecture, unit, component, interaction, route, and API tests pass.
- ESLint, TypeScript, and the production build pass.
