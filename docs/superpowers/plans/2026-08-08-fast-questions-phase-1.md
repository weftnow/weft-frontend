# Weft Phase 1: Fast Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile-first, backend-shaped Fast Questions experience at `/e/[eventId]/conversation` with exactly three rounds, backend-provided participant durations, timestamp-correct countdowns, synchronized participant progression, and a Phase 1 completion boundary.

**Architecture:** A validated `FastQuestionsSession` is the only domain source consumed by the UI. TanStack Query polls a transport-neutral API client through same-origin Route Handlers; a server-side mock repository implements the same contract until the simplified backend endpoint is ready. React owns only timestamp-derived display time and short visual transition state, never round or participant arithmetic.

**Tech Stack:** Next.js 16.2.11 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, CSS Modules, Motion 12, TanStack Query, Zod 4, Bun test, JSDOM.

## Global Constraints

- Work only in `/Users/antoniopertuz/Documents/surnx/weft-web`.
- Prefix every shell command and every command-chain segment with `rtk`.
- Do not initialize another Next.js app and do not modify the landing page or questionnaire.
- Follow the bundled Next.js 16.2.11 guides for pages, client boundaries, CSS, images, Route Handlers, and backend-for-frontend architecture.
- Implement only Phase 1. Do not create a Phase 2 or Phase 3 route, component, fetch, state, or timer.
- Use `participant` terminology throughout new code. Do not introduce new domain names based on “speaker” or “captain.”
- The route is exactly `/e/[eventId]/conversation` and `eventId` is a UUID.
- The backend/session response owns participant duration, round index, participant index, start time, and end time.
- The initial mock durations are 30, 45, and 60 seconds; development/test may use server-only `WEFT_FAST_QUESTIONS_DEV_SECONDS`.
- Development/test defaults to mock state. Production uses it only when `WEFT_CONVERSATION_SOURCE=mock` is explicitly configured; missing production configuration returns unavailable instead of silently simulating synchronization.
- Every group receives exactly three rounds and every round begins at participant index zero.
- Reuse Comfortaa, Geist Mono, `/icon.svg`, bone/ink/ember tokens, Motion, and existing portrait assets.
- Add no dependency except `@tanstack/react-query`. Do not add Redux, WebSockets, SSE, or a chart library.
- Follow strict TDD: focused failing test, expected RED, smallest complete implementation, GREEN, then refactor.
- Preserve unrelated user work. Inspect status before each commit and stage only the task’s files.

---

## File and Responsibility Map

- `package.json`, `bun.lock` — TanStack Query.
- `.env.example` — explicit conversation source and server-only development timer override.
- `src/app/e/[eventId]/conversation/page.tsx` — private dynamic attendee route.
- `src/app/api/events/[eventId]/conversation/**/route.ts` — GET, start, and stale-safe advance boundaries.
- `src/features/conversation/fastQuestions/schemas/fastQuestions.schema.ts` — UUID, participant, round, session, and mutation validation.
- `src/features/conversation/fastQuestions/types/fastQuestions.types.ts` — schema-inferred types and API contract.
- `src/features/conversation/fastQuestions/data/mockFastQuestions.ts` — validated fixture and dev timing policy.
- `src/features/conversation/fastQuestions/model/fastQuestions.machine.ts` — pure timestamp-driven mock transitions.
- `src/features/conversation/fastQuestions/api/server/mockFastQuestions.repository.ts` — event-keyed mock state.
- `src/features/conversation/fastQuestions/api/server/fastQuestions.source.ts` — explicit environment-controlled server source.
- `src/features/conversation/fastQuestions/api/fastQuestions.api.ts` — browser HTTP adapter.
- `src/features/conversation/fastQuestions/hooks/useCountdown.ts` — drift-free clock.
- `src/features/conversation/fastQuestions/hooks/useFastQuestions.ts` — query state and presentation transitions.
- `src/features/conversation/fastQuestions/components/*` — provider, timer, question, participants, progress, notices, completion, and shell.
- `src/features/conversation/fastQuestions/components/FastQuestions.module.css` — isolated reference-led responsive styling.
- Focused tests beside each domain, API, hook, component, and route file.

---

### Task 1: Define and Validate the Session Contract

**Files:**
- Create: `src/features/conversation/fastQuestions/schemas/fastQuestions.schema.ts`
- Create: `src/features/conversation/fastQuestions/schemas/fastQuestions.schema.test.ts`
- Create: `src/features/conversation/fastQuestions/types/fastQuestions.types.ts`
- Create: `src/features/conversation/fastQuestions/data/mockFastQuestions.ts`
- Create: `src/features/conversation/fastQuestions/data/mockFastQuestions.test.ts`

**Interfaces:**
- Produces: `eventIdSchema`, `fastQuestionsSessionSchema`, `advanceParticipantInputSchema`, schema-inferred types, and `createMockFastQuestionsSession(eventId, environment?)`.
- Consumes: Zod 4 and existing portrait assets.

- [ ] **Step 1: Write failing schema tests**

Create `fastQuestions.schema.test.ts`:

```ts
import { expect, test } from "bun:test";
import { eventIdSchema, fastQuestionsSessionSchema } from "./fastQuestions.schema";

const valid = {
  eventId: "6d0c6a42-4d67-4f92-bf75-4c93056dca73",
  phaseId: "phase_1",
  type: "fast_questions",
  status: "active",
  roundIndex: 0,
  participantIndex: 0,
  timerStartedAt: "2026-08-08T20:00:00.000Z",
  timerEndsAt: "2026-08-08T20:00:30.000Z",
  participants: [
    { id: "p1", firstName: "Antonio", avatarUrl: "/a.png", isCurrentUser: false },
    { id: "p2", firstName: "You", avatarUrl: "/b.png", isCurrentUser: true },
    { id: "p3", firstName: "María", avatarUrl: "/c.png", isCurrentUser: false },
  ],
  rounds: [
    { id: "round_1", question: "One?", participantDurationSeconds: 30 },
    { id: "round_2", question: "Two?", participantDurationSeconds: 45 },
    { id: "round_3", question: "Three?", participantDurationSeconds: 60 },
  ],
} as const;

test("accepts one complete three-round session", () => {
  expect(fastQuestionsSessionSchema.parse(valid).rounds).toHaveLength(3);
  expect(eventIdSchema.parse(valid.eventId)).toBe(valid.eventId);
});

test("rejects anything other than exactly three rounds", () => {
  expect(() =>
    fastQuestionsSessionSchema.parse({ ...valid, rounds: valid.rounds.slice(0, 2) }),
  ).toThrow();
});

test("rejects multiple current users and out-of-range participant indices", () => {
  expect(() =>
    fastQuestionsSessionSchema.parse({
      ...valid,
      participantIndex: 3,
      participants: valid.participants.map((participant) => ({
        ...participant,
        isCurrentUser: true,
      })),
    }),
  ).toThrow();
});

test("requires active timestamps and clears them at completion", () => {
  expect(() => fastQuestionsSessionSchema.parse({ ...valid, timerEndsAt: null })).toThrow();
  expect(
    fastQuestionsSessionSchema.parse({
      ...valid,
      status: "phase_complete",
      roundIndex: 2,
      participantIndex: 2,
      timerStartedAt: null,
      timerEndsAt: null,
    }).status,
  ).toBe("phase_complete");
});
```

- [ ] **Step 2: Run RED**

```bash
rtk bun test src/features/conversation/fastQuestions/schemas/fastQuestions.schema.test.ts
```

Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement schemas and inferred types**

Create `fastQuestions.schema.ts`:

```ts
import { z } from "zod";

export const eventIdSchema = z.uuid();
export const participantSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  avatarUrl: z.string().min(1),
  isCurrentUser: z.boolean(),
});
export const fastQuestionRoundSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(1).max(220),
  participantDurationSeconds: z.number().int().min(1).max(600),
});
const timestampSchema = z.iso.datetime({ offset: true });

export const fastQuestionsSessionSchema = z
  .object({
    eventId: eventIdSchema,
    phaseId: z.literal("phase_1"),
    type: z.literal("fast_questions"),
    status: z.enum(["waiting", "active", "phase_complete"]),
    roundIndex: z.number().int().min(0).max(2),
    participantIndex: z.number().int().min(0),
    timerStartedAt: timestampSchema.nullable(),
    timerEndsAt: timestampSchema.nullable(),
    participants: z.array(participantSchema).min(3).max(6),
    rounds: z.array(fastQuestionRoundSchema).length(3),
  })
  .superRefine((session, context) => {
    if (new Set(session.participants.map(({ id }) => id)).size !== session.participants.length) {
      context.addIssue({ code: "custom", path: ["participants"], message: "Duplicate participant IDs" });
    }
    if (new Set(session.rounds.map(({ id }) => id)).size !== session.rounds.length) {
      context.addIssue({ code: "custom", path: ["rounds"], message: "Duplicate round IDs" });
    }
    if (session.participants.filter(({ isCurrentUser }) => isCurrentUser).length !== 1) {
      context.addIssue({ code: "custom", path: ["participants"], message: "Exactly one current user is required" });
    }
    if (session.participantIndex >= session.participants.length) {
      context.addIssue({ code: "custom", path: ["participantIndex"], message: "Participant index is out of range" });
    }
    const hasTimer = session.timerStartedAt !== null && session.timerEndsAt !== null;
    if (session.status === "active" && !hasTimer) {
      context.addIssue({ code: "custom", path: ["timerEndsAt"], message: "Active sessions require timestamps" });
    }
    if (session.status !== "active" && (session.timerStartedAt !== null || session.timerEndsAt !== null)) {
      context.addIssue({ code: "custom", path: ["timerEndsAt"], message: "Inactive sessions cannot carry timestamps" });
    }
  });

export const advanceParticipantInputSchema = z.object({
  roundIndex: z.number().int().min(0).max(2),
  participantIndex: z.number().int().min(0),
});
```

Create `fastQuestions.types.ts`:

```ts
import type { z } from "zod";
import type {
  advanceParticipantInputSchema,
  fastQuestionRoundSchema,
  fastQuestionsSessionSchema,
  participantSchema,
} from "../schemas/fastQuestions.schema";

export type Participant = z.infer<typeof participantSchema>;
export type FastQuestionRound = z.infer<typeof fastQuestionRoundSchema>;
export type FastQuestionsSession = z.infer<typeof fastQuestionsSessionSchema>;
export type AdvanceParticipantInput = z.infer<typeof advanceParticipantInputSchema>;
export type FastQuestionsViewState =
  | "round_intro"
  | "participant_active"
  | "participant_transition"
  | "round_transition"
  | "phase_complete";
export type FastQuestionsApi = {
  getConversationSession(eventId: string): Promise<FastQuestionsSession>;
  startFastQuestionsPhase(eventId: string): Promise<FastQuestionsSession>;
  advanceParticipantTurn(
    eventId: string,
    expected: AdvanceParticipantInput,
  ): Promise<FastQuestionsSession>;
};
```

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: 4 tests pass.

- [ ] **Step 5: Write failing mock-data tests**

Create `mockFastQuestions.test.ts`:

```ts
import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "./mockFastQuestions";

const EVENT_ID = "6d0c6a42-4d67-4f92-bf75-4c93056dca73";

test("uses approved questions and 30/45/60 durations", () => {
  const session = createMockFastQuestionsSession(EVENT_ID, { NODE_ENV: "production" });
  expect(session.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([30, 45, 60]);
  expect(session.rounds[0].question).toBe("What’s one thing you’re working on right now?");
  expect(session.participants).toHaveLength(5);
});

test("honors the development override but ignores it in production", () => {
  const development = createMockFastQuestionsSession(EVENT_ID, {
    NODE_ENV: "development",
    WEFT_FAST_QUESTIONS_DEV_SECONDS: "5",
  });
  const production = createMockFastQuestionsSession(EVENT_ID, {
    NODE_ENV: "production",
    WEFT_FAST_QUESTIONS_DEV_SECONDS: "5",
  });
  expect(development.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([5, 5, 5]);
  expect(production.rounds.map(({ participantDurationSeconds }) => participantDurationSeconds))
    .toEqual([30, 45, 60]);
});
```

- [ ] **Step 6: Run RED, then implement the validated fixture**

Run:

```bash
rtk bun test src/features/conversation/fastQuestions/data/mockFastQuestions.test.ts
```

Expected: FAIL because the fixture module does not exist.

Create `mockFastQuestions.ts` with:

```ts
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { FastQuestionsSession } from "../types/fastQuestions.types";

type MockEnvironment = {
  NODE_ENV?: string;
  WEFT_FAST_QUESTIONS_DEV_SECONDS?: string;
};

const rounds = [
  { id: "round_1", question: "What’s one thing you’re working on right now?", participantDurationSeconds: 30 },
  { id: "round_2", question: "What’s something you’re trying to figure out right now?", participantDurationSeconds: 45 },
  { id: "round_3", question: "What’s one thing someone in this group might be able to help you with?", participantDurationSeconds: 60 },
] as const;

function overrideFor(environment: MockEnvironment): number | null {
  if (environment.NODE_ENV === "production") return null;
  const value = Number(environment.WEFT_FAST_QUESTIONS_DEV_SECONDS);
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
}

export function createMockFastQuestionsSession(
  eventId: string,
  environment: MockEnvironment = process.env,
): FastQuestionsSession {
  const override = overrideFor(environment);
  return fastQuestionsSessionSchema.parse({
    eventId,
    phaseId: "phase_1",
    type: "fast_questions",
    status: "waiting",
    roundIndex: 0,
    participantIndex: 0,
    timerStartedAt: null,
    timerEndsAt: null,
    participants: [
      { id: "antonio", firstName: "Antonio", avatarUrl: "/placeholders/weft/attendee-01.png", isCurrentUser: false },
      { id: "maria", firstName: "María", avatarUrl: "/placeholders/weft/attendee-02.png", isCurrentUser: false },
      { id: "sofia", firstName: "Sofía", avatarUrl: "/placeholders/weft/attendee-03.png", isCurrentUser: false },
      { id: "david", firstName: "David", avatarUrl: "/placeholders/weft/testimonial-02.png", isCurrentUser: false },
      { id: "you", firstName: "You", avatarUrl: "/placeholders/weft/customer1.jpeg", isCurrentUser: true },
    ],
    rounds: rounds.map((round) => ({
      ...round,
      participantDurationSeconds: override ?? round.participantDurationSeconds,
    })),
  });
}
```

- [ ] **Step 7: Verify and commit Task 1**

```bash
rtk bun test src/features/conversation/fastQuestions/schemas/fastQuestions.schema.test.ts src/features/conversation/fastQuestions/data/mockFastQuestions.test.ts
rtk git add src/features/conversation/fastQuestions/schemas src/features/conversation/fastQuestions/types src/features/conversation/fastQuestions/data
rtk git commit -m "feat(conversation): define fast questions contract"
```

Expected: 6 tests pass.

---

### Task 2: Build the Timestamp-Driven Mock State Machine

**Files:**
- Create: `src/features/conversation/fastQuestions/model/fastQuestions.machine.ts`
- Create: `src/features/conversation/fastQuestions/model/fastQuestions.machine.test.ts`
- Create: `src/features/conversation/fastQuestions/api/server/mockFastQuestions.store.ts`
- Create: `src/features/conversation/fastQuestions/api/server/mockFastQuestions.repository.ts`
- Create: `src/features/conversation/fastQuestions/api/server/mockFastQuestions.store.test.ts`
- Create: `src/features/conversation/fastQuestions/api/server/fastQuestions.source.ts`
- Create: `src/features/conversation/fastQuestions/api/server/fastQuestions.source.test.ts`

**Interfaces:**
- Consumes: `FastQuestionsSession` and mock fixture.
- Produces: `startSessionAt`, `advanceSessionAt`, `advanceParticipantAt`, event-keyed repository operations, and explicit source selection.

- [ ] **Step 1: Write failing pure-transition tests**

Create `fastQuestions.machine.test.ts`:

```ts
import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import { advanceParticipantAt, advanceSessionAt, startSessionAt } from "./fastQuestions.machine";

const EVENT_ID = "9de77386-a57f-42d6-9581-cf4a75328a87";
const T0 = Date.parse("2026-08-08T20:00:00.000Z");

function threeParticipants() {
  const session = createMockFastQuestionsSession(EVENT_ID, { NODE_ENV: "production" });
  return fastQuestionsSessionSchema.parse({
    ...session,
    participants: session.participants.slice(0, 3).map((participant, index) => ({
      ...participant,
      isCurrentUser: index === 2,
    })),
  });
}

test("starts at participant zero with the first duration", () => {
  const started = startSessionAt(threeParticipants(), T0);
  expect(started.status).toBe("active");
  expect(started.participantIndex).toBe(0);
  expect(started.timerEndsAt).toBe("2026-08-08T20:00:30.000Z");
});

test("chains from deadlines and restarts each round at participant zero", () => {
  const roundTwo = advanceSessionAt(startSessionAt(threeParticipants(), T0), T0 + 90_000);
  expect([roundTwo.roundIndex, roundTwo.participantIndex]).toEqual([1, 0]);
  expect(roundTwo.timerEndsAt).toBe("2026-08-08T20:02:15.000Z");
});

test("catches up after backgrounding and stops before Phase 2", () => {
  const complete = advanceSessionAt(startSessionAt(threeParticipants(), T0), T0 + 405_000);
  expect(complete.status).toBe("phase_complete");
  expect(complete.timerEndsAt).toBeNull();
});

test("ignores stale advances and rebases a valid early advance", () => {
  const started = startSessionAt(threeParticipants(), T0);
  expect(advanceParticipantAt(started, { roundIndex: 0, participantIndex: 1 }, T0 + 5_000))
    .toEqual(started);
  const valid = advanceParticipantAt(
    started,
    { roundIndex: 0, participantIndex: 0 },
    T0 + 5_000,
  );
  expect(valid.participantIndex).toBe(1);
  expect(valid.timerEndsAt).toBe("2026-08-08T20:00:35.000Z");
});
```

- [ ] **Step 2: Run RED**

```bash
rtk bun test src/features/conversation/fastQuestions/model/fastQuestions.machine.test.ts
```

Expected: FAIL because the machine does not exist.

- [ ] **Step 3: Implement deadline-chained transitions**

Create `fastQuestions.machine.ts`:

```ts
import { fastQuestionsSessionSchema } from "../schemas/fastQuestions.schema";
import type { AdvanceParticipantInput, FastQuestionsSession } from "../types/fastQuestions.types";

function schedule(
  session: FastQuestionsSession,
  roundIndex: number,
  participantIndex: number,
  startsAt: number,
): FastQuestionsSession {
  const duration = session.rounds[roundIndex].participantDurationSeconds;
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "active",
    roundIndex,
    participantIndex,
    timerStartedAt: new Date(startsAt).toISOString(),
    timerEndsAt: new Date(startsAt + duration * 1_000).toISOString(),
  });
}

function step(session: FastQuestionsSession, startsAt: number): FastQuestionsSession {
  if (session.participantIndex + 1 < session.participants.length) {
    return schedule(session, session.roundIndex, session.participantIndex + 1, startsAt);
  }
  if (session.roundIndex + 1 < session.rounds.length) {
    return schedule(session, session.roundIndex + 1, 0, startsAt);
  }
  return fastQuestionsSessionSchema.parse({
    ...session,
    status: "phase_complete",
    roundIndex: 2,
    participantIndex: session.participants.length - 1,
    timerStartedAt: null,
    timerEndsAt: null,
  });
}

export function startSessionAt(session: FastQuestionsSession, now: number) {
  return session.status === "waiting" ? schedule(session, 0, 0, now) : session;
}

export function advanceSessionAt(session: FastQuestionsSession, now: number) {
  let current = session;
  const maximum = session.rounds.length * session.participants.length;
  for (let index = 0; index < maximum; index += 1) {
    if (current.status !== "active" || current.timerEndsAt === null) return current;
    const deadline = Date.parse(current.timerEndsAt);
    if (now < deadline) return current;
    current = step(current, deadline);
  }
  return current;
}

export function advanceParticipantAt(
  session: FastQuestionsSession,
  expected: AdvanceParticipantInput,
  now: number,
) {
  const current = advanceSessionAt(session, now);
  if (
    current.status !== "active" ||
    current.roundIndex !== expected.roundIndex ||
    current.participantIndex !== expected.participantIndex
  ) return current;
  return step(current, now);
}
```

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: 4 tests pass.

- [ ] **Step 5: Write failing store tests**

Create `mockFastQuestions.store.test.ts`:

```ts
import { expect, test } from "bun:test";
import { createMockFastQuestionsStore } from "./mockFastQuestions.store";

test("keeps one canonical event session and makes start idempotent", async () => {
  const store = createMockFastQuestionsStore();
  const eventId = "15336e92-b153-40bc-a3d8-d55643a116af";
  expect((await store.get(eventId, 1_000)).status).toBe("waiting");
  const first = await store.start(eventId, 1_000);
  const duplicate = await store.start(eventId, 2_000);
  expect(first.timerEndsAt).toBe(duplicate.timerEndsAt);
});

test("returns canonical state for stale and valid advances", async () => {
  const store = createMockFastQuestionsStore();
  const eventId = "056dc3d4-b47f-4812-bdb1-f568391cd8bb";
  const started = await store.start(eventId, 1_000);
  const stale = await store.advance(eventId, { roundIndex: 0, participantIndex: 1 }, 2_000);
  const valid = await store.advance(eventId, { roundIndex: 0, participantIndex: 0 }, 2_000);
  expect(stale).toEqual(started);
  expect(valid.participantIndex).toBe(1);
});
```

- [ ] **Step 6: Implement the testable store and server-only wrapper**

`mockFastQuestions.store.ts` creates a private `Map<string, FastQuestionsSession>`
and returns `get`, `start`, and `advance` methods that call the pure machine,
always write canonical results, and accept `now = Date.now()`.

`mockFastQuestions.repository.ts` contains:

```ts
import "server-only";
import { createMockFastQuestionsStore } from "./mockFastQuestions.store";

export const mockFastQuestionsRepository = createMockFastQuestionsStore();
```

This keeps `server-only` out of Bun unit imports without weakening the actual
Route Handler boundary.

- [ ] **Step 7: Write RED tests and implement explicit source selection**

Create `fastQuestions.source.test.ts`:

```ts
import { expect, test } from "bun:test";
import { conversationSource } from "./fastQuestions.source";

test("defaults to mock only outside production", () => {
  expect(conversationSource({ NODE_ENV: "test" })).toBe("mock");
  expect(() => conversationSource({ NODE_ENV: "production" })).toThrow(
    "Conversation source is not configured",
  );
});

test("allows explicit production mock and rejects unknown values", () => {
  expect(conversationSource({
    NODE_ENV: "production",
    WEFT_CONVERSATION_SOURCE: "mock",
  })).toBe("mock");
  expect(() => conversationSource({
    NODE_ENV: "production",
    WEFT_CONVERSATION_SOURCE: "other",
  })).toThrow("Unsupported conversation source");
});
```

Run the new test and confirm it fails because the selector is absent.
`fastQuestions.source.ts` exports the tested pure `conversationSource` and
`getFastQuestionsRepository`. The latter returns
`mockFastQuestionsRepository` only for source `mock` and throws a typed
configuration error otherwise. Route Handlers map that typed error to
`503 {"code":"conversation_not_configured"}`.

- [ ] **Step 8: Verify and commit Task 2**

```bash
rtk bun test src/features/conversation/fastQuestions/model/fastQuestions.machine.test.ts src/features/conversation/fastQuestions/api/server/mockFastQuestions.store.test.ts src/features/conversation/fastQuestions/api/server/fastQuestions.source.test.ts
rtk git add src/features/conversation/fastQuestions/model src/features/conversation/fastQuestions/api/server
rtk git commit -m "feat(conversation): add fast questions state machine"
```

Expected: 6 tests pass.

---

### Task 3: Add Same-Origin Handlers and the Browser API Client

**Files:**
- Create: `src/app/api/events/[eventId]/conversation/route.ts` and `route.test.ts`
- Create: `src/app/api/events/[eventId]/conversation/start/route.ts` and `route.test.ts`
- Create: `src/app/api/events/[eventId]/conversation/advance/route.ts` and `route.test.ts`
- Create: `src/features/conversation/fastQuestions/api/fastQuestions.api.ts`
- Create: `src/features/conversation/fastQuestions/api/fastQuestions.api.test.ts`

**Interfaces:**
- Consumes: Task 1 schemas and Task 2 repository.
- Produces: complete-session GET/start/advance endpoints, `FastQuestionsApiError`, and default `fastQuestionsApi`.

- [ ] **Step 1: Write failing Route Handler tests**

The GET test uses unique event IDs:

```ts
import { expect, test } from "bun:test";
import { GET } from "./route";

test("validates the event ID before reading a session", async () => {
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId: "bad" }),
  });
  expect(response.status).toBe(400);
});

test("returns a complete waiting session", async () => {
  const eventId = "f96564ea-6390-4523-8d73-a4a99b92f3c4";
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ eventId }),
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.eventId).toBe(eventId);
  expect(body.rounds).toHaveLength(3);
});
```

The start test calls POST twice for
`524aa2f5-284a-4ca0-b737-a8847bacfc67` and asserts both responses share the
same `timerEndsAt`. The advance test sends `{}` and expects `400`, then sends
`{"roundIndex":0,"participantIndex":0}` after start and expects
`participantIndex === 1`.

In the GET test, temporarily set `WEFT_CONVERSATION_SOURCE=other`, restore it
in `finally`, and assert a typed source-configuration failure becomes
`503 {"code":"conversation_not_configured"}` rather than mock state.

- [ ] **Step 2: Run RED**

```bash
rtk bun test 'src/app/api/events/[eventId]/conversation/route.test.ts' 'src/app/api/events/[eventId]/conversation/start/route.test.ts' 'src/app/api/events/[eventId]/conversation/advance/route.test.ts'
```

Expected: FAIL because the handlers do not exist.

- [ ] **Step 3: Implement thin validated handlers**

The GET handler:

```ts
import { getFastQuestionsRepository } from "@/features/conversation/fastQuestions/api/server/fastQuestions.source";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: Context) {
  const parsed = eventIdSchema.safeParse((await context.params).eventId);
  if (!parsed.success) {
    return Response.json({ code: "invalid_event_id" }, { status: 400 });
  }
  return Response.json(await getFastQuestionsRepository().get(parsed.data));
}
```

The start handler performs the same validation and calls
`getFastQuestionsRepository().start`. The advance handler catches invalid JSON,
validates with `advanceParticipantInputSchema`, and calls
`getFastQuestionsRepository().advance`. Invalid ID/body responses use stable
`400` codes. Catch only `ConversationSourceError` and map it to stable `503`;
unexpected errors remain visible as `500`.

- [ ] **Step 4: Run handler tests and verify GREEN**

Run the Step 2 command. Expected: all handler tests pass.

- [ ] **Step 5: Write failing browser-client tests**

Create `fastQuestions.api.test.ts`:

```ts
import { afterEach, expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { fastQuestionsApi, FastQuestionsApiError } from "./fastQuestions.api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loads and validates the canonical event session", async () => {
  const eventId = "8f39ad30-f5f4-4404-8760-592e69794816";
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return Response.json(createMockFastQuestionsSession(eventId));
  }) as typeof fetch;
  expect((await fastQuestionsApi.getConversationSession(eventId)).eventId).toBe(eventId);
  expect(calls).toEqual(["/api/events/" + eventId + "/conversation"]);
});

test("surfaces a stable unsuccessful-response error", async () => {
  globalThis.fetch = (async () =>
    Response.json({ code: "unavailable" }, { status: 503 })) as typeof fetch;
  try {
    await fastQuestionsApi.getConversationSession(
      "4c22054a-00ea-49a2-8172-c009c9e78152",
    );
    throw new Error("Expected request to fail");
  } catch (error) {
    expect(error instanceof FastQuestionsApiError).toBe(true);
    expect((error as FastQuestionsApiError).status).toBe(503);
  }
});
```

- [ ] **Step 6: Run RED, then implement the client**

Run:

```bash
rtk bun test src/features/conversation/fastQuestions/api/fastQuestions.api.test.ts
```

Expected: FAIL because `fastQuestions.api.ts` does not exist.

Create it with an 8-second `AbortSignal.timeout`, event/body validation,
complete response validation, and this interface implementation:

```ts
export const fastQuestionsApi: FastQuestionsApi = {
  getConversationSession(eventId) {
    const id = eventIdSchema.parse(eventId);
    return requestSession("/api/events/" + id + "/conversation");
  },
  startFastQuestionsPhase(eventId) {
    const id = eventIdSchema.parse(eventId);
    return requestSession("/api/events/" + id + "/conversation/start", { method: "POST" });
  },
  advanceParticipantTurn(eventId, expected) {
    const id = eventIdSchema.parse(eventId);
    const body = advanceParticipantInputSchema.parse(expected);
    return requestSession("/api/events/" + id + "/conversation/advance", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
```

`requestSession` sets JSON headers, throws
`new FastQuestionsApiError(response.status, code)` for non-OK responses, and
returns `fastQuestionsSessionSchema.parse(await response.json())`.

- [ ] **Step 7: Verify and commit Task 3**

```bash
rtk bun test 'src/app/api/events/[eventId]/conversation/route.test.ts' 'src/app/api/events/[eventId]/conversation/start/route.test.ts' 'src/app/api/events/[eventId]/conversation/advance/route.test.ts' src/features/conversation/fastQuestions/api/fastQuestions.api.test.ts
rtk git add 'src/app/api/events/[eventId]/conversation' src/features/conversation/fastQuestions/api
rtk git commit -m "feat(conversation): expose fast questions session API"
```

---

### Task 4: Add TanStack Query and the Conversation Controller

**Files:**
- Modify: `package.json`, `bun.lock`
- Create: `src/features/conversation/fastQuestions/components/FastQuestionsProvider.tsx`
- Create: `src/features/conversation/fastQuestions/hooks/useFastQuestions.ts`
- Create: `src/features/conversation/fastQuestions/hooks/useFastQuestions.test.ts`
- Create: `src/features/conversation/fastQuestions/hooks/useFastQuestions.mount.tsx`

**Interfaces:**
- Consumes: `FastQuestionsApi`.
- Produces: narrow Query provider and `useFastQuestions` returning canonical
  session, view state, retry, and advance action.

- [ ] **Step 1: Add the requested dependency**

```bash
rtk bun add @tanstack/react-query
```

Expected: only `package.json` and `bun.lock` dependency metadata changes.

- [ ] **Step 2: Write a failing visual-state test**

```ts
import { expect, test } from "bun:test";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { resolveViewState } from "./useFastQuestions";

const base = createMockFastQuestionsSession("6071af2e-7936-4b15-bb44-e4d917337543");

test("maps canonical identity changes to explicit visual states", () => {
  expect(resolveViewState(null, { ...base, status: "active" })).toBe("round_intro");
  expect(resolveViewState(
    { ...base, status: "active", participantIndex: 0 },
    { ...base, status: "active", participantIndex: 1 },
  )).toBe("participant_transition");
  expect(resolveViewState(
    { ...base, status: "active", roundIndex: 0 },
    { ...base, status: "active", roundIndex: 1 },
  )).toBe("round_transition");
  expect(resolveViewState(base, { ...base, status: "phase_complete" }))
    .toBe("phase_complete");
});
```

- [ ] **Step 3: Run RED**

```bash
rtk bun test src/features/conversation/fastQuestions/hooks/useFastQuestions.test.ts
```

Expected: FAIL because the controller does not exist.

- [ ] **Step 4: Implement provider and controller**

`FastQuestionsProvider` creates one `QueryClient` through lazy `useState` with
query defaults `retry: 2` and `staleTime: 500`.

`useFastQuestions` must:

- use key `["fastQuestions", eventId]`;
- poll every 1,500ms only while canonical status is `active`;
- idempotently call start whenever canonical status is `waiting`;
- replace cache with every successful start/advance response;
- expose `resolveViewState(previous, next)`;
- use one cleaned timeout to settle `round_intro`,
  `participant_transition`, and `round_transition` to
  `participant_active` after 360ms;
- never increment a domain index locally.

The core transition resolver is:

```ts
export function resolveViewState(previous, next): FastQuestionsViewState {
  if (next.status === "phase_complete") return "phase_complete";
  if (!previous || previous.status === "waiting") return "round_intro";
  if (previous.roundIndex !== next.roundIndex) return "round_transition";
  if (previous.participantIndex !== next.participantIndex) {
    return "participant_transition";
  }
  return "participant_active";
}
```

- [ ] **Step 5: Mount-test auto-start and cleanup**

Create an isolated JSDOM mount test with a real `QueryClientProvider` and an
injected API. The API returns waiting, records one start call, then returns
active. A probe prints `session?.status` and `viewState`. With transition time
zero, assert:

```ts
expect(startCalls).toEqual([EVENT_ID]);
expect(container.textContent).toContain("active");
expect(container.textContent).toContain("participant_active");
```

Unmount in `finally`, configure `retry: false` and `gcTime: 0`, and fail on
React act warnings. Use the existing isolated `Bun.spawn` test pattern instead
of sharing JSDOM globals with the full suite.

- [ ] **Step 6: Verify and commit Task 4**

```bash
rtk bun test src/features/conversation/fastQuestions/hooks/useFastQuestions.test.ts
rtk git add package.json bun.lock src/features/conversation/fastQuestions/components/FastQuestionsProvider.tsx src/features/conversation/fastQuestions/hooks
rtk git commit -m "feat(conversation): query canonical fast questions state"
```

---

### Task 5: Build the Drift-Free Countdown and SVG Ring

**Files:**
- Create: `src/features/conversation/fastQuestions/hooks/useCountdown.ts`
- Create: `src/features/conversation/fastQuestions/hooks/useCountdown.test.ts`
- Create: `src/features/conversation/fastQuestions/hooks/useCountdown.mount.tsx`
- Create: `src/features/conversation/fastQuestions/components/CircularTimer.tsx`
- Create: `src/features/conversation/fastQuestions/components/CircularTimer.test.tsx`

**Interfaces:**
- Produces: `remainingMilliseconds`, `formatCountdown`, `useCountdown`, and
  reusable `CircularTimer`.

- [ ] **Step 1: Write failing arithmetic tests**

```ts
import { expect, test } from "bun:test";
import { formatCountdown, remainingMilliseconds } from "./useCountdown";

test("derives from an absolute deadline and clamps at zero", () => {
  const deadline = "2026-08-08T20:00:30.000Z";
  expect(remainingMilliseconds(deadline, Date.parse("2026-08-08T20:00:00.000Z")))
    .toBe(30_000);
  expect(remainingMilliseconds(deadline, Date.parse("2026-08-08T20:01:00.000Z")))
    .toBe(0);
});

test("formats ceiling-based MM:SS", () => {
  expect(formatCountdown(90_000)).toBe("01:30");
  expect(formatCountdown(29_001)).toBe("00:30");
  expect(formatCountdown(0)).toBe("00:00");
});
```

- [ ] **Step 2: Run RED**

```bash
rtk bun test src/features/conversation/fastQuestions/hooks/useCountdown.test.ts
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement timestamp arithmetic and cleanup**

```ts
"use client";

import { useEffect, useState } from "react";

export function remainingMilliseconds(deadline: string | null, now: number) {
  return deadline ? Math.max(0, Date.parse(deadline) - now) : 0;
}

export function formatCountdown(milliseconds: number) {
  const total = Math.ceil(Math.max(0, milliseconds) / 1_000);
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" +
    String(total % 60).padStart(2, "0");
}

export function useCountdown(timerEndsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [timerEndsAt]);
  return remainingMilliseconds(timerEndsAt, now);
}
```

Add a JSDOM mount test that records interval and visibility listener
registration/removal, mounts a hook probe, unmounts, and asserts exact cleanup.

- [ ] **Step 4: Write failing SVG component test**

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CircularTimer } from "./CircularTimer";

test("renders accessible non-live proportional progress", () => {
  const html = renderToStaticMarkup(
    <CircularTimer durationSeconds={60} remainingMilliseconds={30_000} running />,
  );
  expect(html).toContain("00:30");
  expect(html).toContain("time left");
  expect(html).toContain('role="timer"');
  expect(html).not.toContain("aria-live");
  expect(html).toContain('data-progress="0.5"');
});
```

- [ ] **Step 5: Implement the SVG ring**

Use viewBox `0 0 240 240`, radius `114`, stroke width `3`, a neutral track,
and ember progress rotated `-90deg`. Clamp remaining time, calculate
`progress = remaining / duration`, and set
`strokeDashoffset = circumference * (1 - progress)`. Render a visible
`MM:SS` and “time left,” `role="timer"`, and an aria label in seconds. Do not
use a live region. CSS animates dash offset linearly for one second while
running.

- [ ] **Step 6: Verify and commit Task 5**

```bash
rtk bun test src/features/conversation/fastQuestions/hooks/useCountdown.test.ts src/features/conversation/fastQuestions/components/CircularTimer.test.tsx
rtk git add src/features/conversation/fastQuestions/hooks/useCountdown* src/features/conversation/fastQuestions/components/CircularTimer*
rtk git commit -m "feat(conversation): add synchronized circular countdown"
```

---

### Task 6: Build the Question, Participant, Progress, and Completion Presentation

**Files:**
- Create: `src/features/conversation/fastQuestions/components/QuestionDisplay.tsx`
- Create: `src/features/conversation/fastQuestions/components/ParticipantAvatar.tsx`
- Create: `src/features/conversation/fastQuestions/components/ParticipantList.tsx`
- Create: `src/features/conversation/fastQuestions/components/RoundProgress.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestionsCompletion.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestionsNotice.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.presentation.test.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.module.css`
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.layout.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types.
- Produces: API-free, timer-free presentational components and isolated styles.

- [ ] **Step 1: Write failing semantic tests**

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createMockFastQuestionsSession } from "../data/mockFastQuestions";
import { FastQuestionsCompletion } from "./FastQuestionsCompletion";
import { ParticipantList } from "./ParticipantList";
import { QuestionDisplay } from "./QuestionDisplay";
import { RoundProgress } from "./RoundProgress";

const session = createMockFastQuestionsSession(
  "a8ad9264-b8ce-4ee6-bfad-8f3172a5b76c",
);

test("keeps the question as the primary heading", () => {
  const html = renderToStaticMarkup(<QuestionDisplay round={session.rounds[0]} />);
  expect(html).toContain("<h1");
  expect(html).toContain("What’s one thing you’re working on right now?");
});

test("marks exactly one active participant and preserves full names", () => {
  const html = renderToStaticMarkup(
    <ParticipantList activeParticipantId="antonio" participants={session.participants} />,
  );
  expect((html.match(/data-active="true"/g) ?? [])).toHaveLength(1);
  expect(html).toContain("Antonio, currently responding");
  expect(html).toContain("María");
});

test("renders three round indicators and current count", () => {
  const html = renderToStaticMarkup(<RoundProgress currentRoundIndex={1} />);
  expect((html.match(/data-round-indicator/g) ?? [])).toHaveLength(3);
  expect(html).toContain("2 of 3");
});

test("completion does not introduce Phase 2 content", () => {
  const html = renderToStaticMarkup(<FastQuestionsCompletion onContinue={() => {}} />);
  expect(html).toContain("Fast questions complete.");
  expect(html).toContain("Continue");
  expect(html).not.toContain("Shared Challenge");
});
```

- [ ] **Step 2: Run RED**

```bash
rtk bun test src/features/conversation/fastQuestions/components/FastQuestions.presentation.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement focused components**

- `QuestionDisplay` renders a keyed Motion `h1` containing only
  `round.question` and travels no more than 8px.
- `ParticipantAvatar` renders one `li` with
  `aria-label="Name, currently responding"` or `"Name, waiting"`, a Next Image
  with decorative empty alt, full name in `title`, `data-active`, ember outline,
  name, and activity dot only when active.
- `ParticipantList` renders an ordered list, `data-count`, CSS variable
  `--participant-count`, and exactly one `activeParticipantId`.
- `RoundProgress` renders three decorative bars, `aria-current="step"` on the
  current bar, “Round progress,” and “N of 3.”
- `FastQuestionsCompletion` renders the existing mark, exact approved heading
  and supporting copy, and one keyboard-operable Continue button.
- `FastQuestionsNotice` supports `loading`, `invalid`, and `error`. Loading says
  “Preparing your conversation…”, invalid says “This event link isn’t valid.”,
  and error says “We couldn’t sync the conversation.” with Retry when supplied.

Use `motion/react` and `useReducedMotion` only for restrained opacity and
translate transitions; no spring bounce.

- [ ] **Step 4: Write failing layout-contract tests**

```ts
import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const styles = await readFile(
  new URL("./FastQuestions.module.css", import.meta.url),
  "utf8",
);

test("uses safe-area mobile framing and constrained-height reductions", () => {
  expect(styles).toMatch(/min-height:\s*100svh/);
  expect(styles).toMatch(/env\(safe-area-inset-top\)/);
  expect(styles).toMatch(/env\(safe-area-inset-bottom\)/);
  expect(styles).toMatch(/@media\s*\(max-height:\s*740px\)/);
});

test("supports reduced motion and six participants without scrolling", () => {
  expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(styles).toMatch(/\[data-count="6"\]/);
  expect(styles).not.toMatch(/overflow-x:\s*scroll/);
});
```

- [ ] **Step 5: Implement the CSS Module**

Use these exact structural rules:

```css
.shell {
  isolation: isolate;
  min-height: 100svh;
  background:
    radial-gradient(circle at 50% 20%, rgb(244 81 30 / 3.5%), transparent 24rem),
    var(--color-bone);
  color: var(--color-ink);
}

.frame {
  display: flex;
  width: min(100%, 32rem);
  min-height: 100svh;
  margin: 0 auto;
  flex-direction: column;
  align-items: center;
  padding:
    max(1rem, env(safe-area-inset-top))
    clamp(1rem, 4vw, 1.5rem)
    max(1rem, env(safe-area-inset-bottom));
}

.question {
  max-width: 29rem;
  margin: 0;
  font-size: clamp(2rem, 8vw, 3.35rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 1.08;
  text-align: center;
  text-wrap: balance;
}

.timer {
  width: clamp(12rem, 58vw, 16.5rem);
  aspect-ratio: 1;
}

.participantList {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(var(--participant-count), minmax(0, 1fr));
  gap: clamp(0.25rem, 1.7vw, 0.7rem);
  padding: 0;
  margin: 0;
  list-style: none;
}

.participantList[data-count="6"] .avatarFrame {
  width: clamp(2.75rem, 11.5vw, 3.75rem);
}

@supports (height: 100dvh) {
  .shell,
  .frame { min-height: 100dvh; }
}

@media (max-height: 740px) {
  .frame { gap: 0.55rem; }
  .timer { width: clamp(10.5rem, 42vh, 13rem); }
  .question { font-size: clamp(1.75rem, 6.7vw, 2.55rem); }
}

@media (prefers-reduced-motion: reduce) {
  .shell *,
  .shell *::before,
  .shell *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Set the remaining values explicitly:

- frame vertical gap: `clamp(0.85rem, 2.5vh, 1.5rem)`;
- mark: 34–42px; phase label: 0.66rem mono, 0.18em tracking;
- round label: 1rem ember;
- active-participant label: 1rem, activity dot 0.5rem;
- avatar frame: `clamp(3rem, 13vw, 4.5rem)`, 2px neutral/ember border;
- names: 0.75–0.9rem, one-line ellipsis, active ember;
- guidance: two columns, 1.4rem orange icon and 0.82rem ink/55 copy;
- footer: 1px ink/10 separator and three 2rem × 0.28rem rounded bars;
- focus-visible: 3px signal outline with 3px offset;
- no cards, glass, box shadows, or horizontal scrolling.

- [ ] **Step 6: Verify and commit Task 6**

```bash
rtk bun test src/features/conversation/fastQuestions/components/FastQuestions.presentation.test.tsx src/features/conversation/fastQuestions/components/FastQuestions.layout.test.ts
rtk git add src/features/conversation/fastQuestions/components
rtk git commit -m "feat(conversation): build fast questions presentation"
```

---

### Task 7: Compose the Experience and Add the Event Route

**Files:**
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.interaction.mount.tsx`
- Create: `src/features/conversation/fastQuestions/components/FastQuestions.interaction.test.ts`
- Create: `src/app/e/[eventId]/conversation/page.tsx`
- Create: `src/app/e/[eventId]/conversation/page.test.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: full Phase 1 composition, meaningful live announcements, stable
  completion, and the event route.

- [ ] **Step 1: Write the failing route test**

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import EventConversationPage, { metadata } from "./page";

test("renders the private conversation entry for a valid event ID", async () => {
  const html = renderToStaticMarkup(
    await EventConversationPage({
      params: Promise.resolve({
        eventId: "7450326b-00d8-4c3a-8651-16cec6d46d91",
      }),
    }),
  );
  expect(html).toContain("Preparing your conversation");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test("renders invalid-link guidance without mounting the experience", async () => {
  const html = renderToStaticMarkup(
    await EventConversationPage({
      params: Promise.resolve({ eventId: "invalid" }),
    }),
  );
  expect(html).toContain("This event link isn");
  expect(html).not.toContain("Preparing your conversation");
});
```

- [ ] **Step 2: Run RED**

```bash
rtk bun test 'src/app/e/[eventId]/conversation/page.test.tsx'
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the feature shell**

`FastQuestions` is a client entry wrapped by `FastQuestionsProvider`. Its inner
component:

1. calls `useFastQuestions(eventId)`;
2. renders notice states for pending/error;
3. renders completion when canonical status is `phase_complete`;
4. derives current round/participant only from canonical indices;
5. calls `useCountdown(timerEndsAt)`;
6. invalidates the event query once per expired deadline;
7. announces only “Name’s turn” (or “Your turn” for `isCurrentUser`) and round
   changes through one polite live region, never countdown ticks;
8. composes mark, phase label, round label, question, active participant,
   circular timer, participant list, guidance, and progress in reference order;
9. uses `AnimatePresence mode="wait"` and 180–260ms reduced-motion-aware fades.

The guidance uses the canonical round duration:
“Everyone gets {participantDurationSeconds} seconds to respond. Be honest, be
concise, be you.” It never hardcodes 90 seconds.

Continue dispatches an integration-only event and does not navigate:

```ts
window.dispatchEvent(
  new CustomEvent("weft:phase-one-continue", { detail: { eventId } }),
);
```

- [ ] **Step 4: Add the failing full interaction mount**

Use isolated JSDOM, a real QueryClient, and an injected API that progresses
through waiting, active Round 1 participant 0, active Round 1 participant 1,
active Round 2 participant 0, and complete. With zero visual delay, assert:

```ts
expect(container.textContent).toContain("Round 1 of 3");
expect(container.textContent).toContain("Antonio’s turn");
expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
expect(container.textContent).toContain("María’s turn");
expect(container.textContent).toContain("Everyone gets 30 seconds to respond.");
expect(container.textContent).toContain("Round 2 of 3");
expect(container.textContent).toContain("Antonio’s turn");
expect(container.textContent).toContain("Fast questions complete.");
expect(container.textContent).not.toContain("Shared Challenge");
```

Assert the live region never contains `00:`. Unmount in `finally` and fail on
React act warnings. Spawn the mount file from `FastQuestions.interaction.test.ts`
so its DOM globals cannot leak into the full suite.

Add one canonical state with the current user active and assert the label is
“Your turn,” never “You’s turn.”

- [ ] **Step 5: Implement the App Router page**

```tsx
import type { Metadata } from "next";
import { FastQuestions } from "@/features/conversation/fastQuestions/components/FastQuestions";
import { FastQuestionsNotice } from "@/features/conversation/fastQuestions/components/FastQuestionsNotice";
import { eventIdSchema } from "@/features/conversation/fastQuestions/schemas/fastQuestions.schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Fast questions | Weft",
  description: "A guided conversation for your Weft group.",
  robots: { index: false, follow: false },
};

export default async function EventConversationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const parsed = eventIdSchema.safeParse((await params).eventId);
  if (!parsed.success) return <FastQuestionsNotice kind="invalid" />;
  return <FastQuestions eventId={parsed.data} />;
}
```

Append:

```dotenv
# Development/test mock only. Ignored in production.
WEFT_FAST_QUESTIONS_DEV_SECONDS=
# Set to mock only when a deployment deliberately uses mock conversation state.
WEFT_CONVERSATION_SOURCE=
```

- [ ] **Step 6: Verify and commit Task 7**

```bash
rtk bun test 'src/app/e/[eventId]/conversation/page.test.tsx' src/features/conversation/fastQuestions/components/FastQuestions.interaction.test.ts
rtk git add .env.example 'src/app/e/[eventId]/conversation' src/features/conversation/fastQuestions/components/FastQuestions.tsx src/features/conversation/fastQuestions/components/FastQuestions.interaction.mount.tsx src/features/conversation/fastQuestions/components/FastQuestions.interaction.test.ts
rtk git commit -m "feat(conversation): add fast questions event route"
```

---

### Task 8: Verify the Complete Feature and Perform Visual QA

**Files:**
- Modify only when verification exposes a defect: the affected implementation
  file and its focused regression test.
- Do not add Phase 2/3 or unrelated refactors.

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: automated and browser evidence for the complete requested slice.

- [ ] **Step 1: Run focused and full automated verification**

```bash
rtk bun test src/features/conversation/fastQuestions 'src/app/api/events/[eventId]/conversation' 'src/app/e/[eventId]/conversation'
rtk bun test
rtk bun run lint
rtk bun run build
rtk git diff --check
rtk git status --short
```

Expected: focused and full tests pass, ESLint has no errors, Next production
build exits 0, diff check is clean, and status contains no uncommitted task
files.

- [ ] **Step 2: Start five-second local development mode**

Set `WEFT_FAST_QUESTIONS_DEV_SECONDS=5` in the existing uncommitted local
environment and run:

```bash
rtk bun run dev -- --port 3001
```

Open
`http://localhost:3001/e/7450326b-00d8-4c3a-8651-16cec6d46d91/conversation`.

- [ ] **Step 3: Perform browser QA with the in-app browser skill**

Verify and capture standard-phone and desktop screenshots:

1. 320×568: readable question; timer/avatars shrink before scrolling; no
   horizontal overflow.
2. 390×844: all primary content fits comfortably.
3. 430×932: hierarchy and proportions closely match the supplied reference.
4. 1366×900: centered phone-derived experience, not a dashboard.
5. Three- and six-participant fixtures: one active participant, no overlap,
   accessible full names.
6. All rounds: every participant receives one turn; Rounds 2 and 3 restart at
   participant zero; progress updates naturally.
7. Background longer than one mock turn and return: canonical state and
   countdown catch up.
8. Reduced motion: no bounce/large travel; state remains clear.
9. Keyboard: Retry and Continue have visible focus and activate.
10. Completion: polling stops, Continue emits the integration event, and no
    Phase 2 UI or timer begins.

Fix any defect through a focused failing regression test, then rerun Step 1.

- [ ] **Step 4: Record final evidence**

Report focused/full test counts, lint/build results, checked viewports,
background/reduced-motion results, exact commits, and the remaining backend
seam: mock handlers will be replaced by the simplified authoritative endpoint
without changing the UI contract.

Do not claim completion without fresh successful command output.

---

## Plan Self-Review Checklist

- Every approved rule is covered: event route, participant terminology,
  backend-shaped 30/45/60 durations, three rounds, participant-zero restart,
  no privileged role, no automatic Phase 2, absolute timestamps, TanStack
  polling, dev override, reference fidelity, accessibility, and responsive QA.
- The only dependency addition is `@tanstack/react-query`.
- Mock storage is explicitly selected infrastructure, not durable multi-device
  production synchronization; production never falls back to it implicitly.
- UI code never increments round or participant indices locally.
- Every production behavior begins with a focused failing test.
- No task modifies the questionnaire, landing page, Phase 2, or Phase 3.
