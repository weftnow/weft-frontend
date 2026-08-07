# Attendee Questionnaire Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resumable, configuration-driven conversational attendee questionnaire at `/questionnaire` that matches the supplied Weft mobile reference and can be completed end to end.

**Architecture:** Keep the App Router page server-rendered and place the interactive questionnaire behind one client boundary. Zod-validated configuration and session records flow through a transport-neutral mock API backed by versioned browser storage; TanStack Query owns that durable server-like state, while React-local state owns only typing, composer drafts, and short transition phases.

**Tech Stack:** Next.js 16.2.11 App Router, React 19.2.4, strict TypeScript, Tailwind CSS 4, Motion 12, TanStack Query 5, Zod 4, Bun tests, JSDOM

## Global Constraints

- Build only `/questionnaire`; do not change the landing page, demo-b2c feature, authentication, organizer tools, matching results, dashboards, or PWA behavior.
- Treat the attached mobile design as the primary visual reference and reuse `--font-comfortaa`, `--font-geist-mono`, `--color-bone`, `--color-paper`, `--color-ink`, `--color-ember`, and `/icon.svg`.
- Render no navbar and do not imitate a generic chatbot or use a chat UI library.
- Every newly introduced Weft message types progressively; old and resumed messages never retype.
- Do not expose a composer until the active Weft message has finished typing.
- Respect `prefers-reduced-motion` by rendering complete text and removing nonessential motion.
- Support text, single-choice, multiple-choice, and hybrid questions from validated configuration.
- Persist only API-accepted state; unsent drafts and partial multiple selections may reset on refresh.
- Use TanStack Query around `getQuestionnaire`, `submitAnswer`, and `completeQuestionnaire`; do not use Server Actions as the API abstraction.
- Do not introduce Zustand, Redux, a form library, or additional global state.
- Preserve unrelated untracked paths `.serena/memories/` and `src/app/visual-pair-preview/`.
- Read the local Next.js 16 guides before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `05-server-and-client-components.md`, `11-css.md`, and `03-api-reference/01-directives/use-client.md`.
- Follow test-driven development: every behavior change begins with a failing test whose failure is observed before production code is written.

## File Map

- `src/app/questionnaire/page.tsx` — server route, metadata, and feature entry.
- `src/features/questionnaire/schemas/questionnaire.schema.ts` — configuration, answer, conversation, session, and API-result Zod schemas.
- `src/features/questionnaire/types/questionnaire.types.ts` — inferred domain types plus transient conversation phase and submit input types.
- `src/features/questionnaire/data/mockQuestionnaire.ts` — validated professional-networking questionnaire configuration.
- `src/features/questionnaire/api/questionnaire.api.ts` — storage adapter and the three transport-neutral mock API functions.
- `src/features/questionnaire/hooks/useQuestionnaire.ts` — TanStack Query read/mutation binding and canonical cache updates.
- `src/features/questionnaire/components/Questionnaire.tsx` — Query provider plus phase orchestration.
- `src/features/questionnaire/components/Conversation.tsx` — scroll viewport, follow behavior, and live-region boundary.
- `src/features/questionnaire/components/ConversationItem.tsx` — Weft/attendee item presentation.
- `src/features/questionnaire/components/TypewriterMessage.tsx` — progressive text revelation for only the active new Weft message.
- `src/features/questionnaire/components/QuestionComposer.tsx` — discriminated composer switch.
- `src/features/questionnaire/components/TextComposer.tsx` — text draft and Enter/send behavior.
- `src/features/questionnaire/components/SingleChoiceComposer.tsx` — one-choice confirmation and submit behavior.
- `src/features/questionnaire/components/MultipleChoiceComposer.tsx` — bounded selection and Continue behavior.
- `src/features/questionnaire/components/HybridComposer.tsx` — predefined choice or inline Other text behavior.
- `src/styles/globals.css` — a small scoped `questionnaire-*` layer for safe-area, viewport, scrollbar, ambient texture, and reduced-motion fallbacks not expressible cleanly in utilities.
- `tests/architecture.test.ts` — feature-boundary and route-existence assertions.

---

### Task 1: Domain Schemas and Mock Questionnaire

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/features/questionnaire/schemas/questionnaire.schema.ts`
- Create: `src/features/questionnaire/schemas/questionnaire.schema.test.ts`
- Create: `src/features/questionnaire/types/questionnaire.types.ts`
- Create: `src/features/questionnaire/data/mockQuestionnaire.ts`
- Create: `src/features/questionnaire/data/mockQuestionnaire.test.ts`

**Interfaces:**
- Consumes: Zod 4.
- Produces: `questionnaireSchema`, `sessionSchema`, `answerValueSchema`, `questionnaireResultSchema`, `parseAnswerForQuestion(question, value)`, `Questionnaire`, `Question`, `ConversationItem`, `QuestionnaireSession`, `ConversationPhase`, and `mockQuestionnaire`.

- [ ] **Step 1: Install the required runtime dependencies**

Run:

```bash
rtk bun add @tanstack/react-query zod
```

Expected: `package.json` and `bun.lock` add only `@tanstack/react-query` and `zod` as runtime dependencies.

- [ ] **Step 2: Write failing schema tests**

Create `questionnaire.schema.test.ts` with one valid case per discriminant and explicit invalid cases:

```ts
import { expect, test } from "bun:test";
import {
  parseAnswerForQuestion,
  questionnaireSchema,
  sessionSchema,
} from "./questionnaire.schema";

const options = [
  { id: "a", label: "Founders", value: "founders" },
  { id: "b", label: "Operators", value: "operators" },
  { id: "c", label: "Investors", value: "investors" },
];

test("questionnaire schema accepts every supported question kind", () => {
  const result = questionnaireSchema.safeParse({
    id: "networking-night",
    version: 1,
    intro: {
      eyebrow: "Weft questionnaire",
      title: "Let's get to know you",
      subtitle: "This helps us find your people in the room.",
      welcome: "Hi, I'm Weft. I'll ask a few quick questions.",
    },
    completionMessages: [
      "You’re all set.",
      "Thanks. We’ll use your answers to introduce you to the right people.",
    ],
    questions: [
      { id: "text", type: "text", message: "What are you building?", required: true },
      { id: "single", type: "single_choice", message: "Why are you here?", options },
      { id: "multiple", type: "multiple_choice", message: "Pick two", options, minSelections: 1, maxSelections: 2 },
      { id: "hybrid", type: "hybrid", message: "Who should you meet?", options, allowOther: true },
    ],
  });
  expect(result.success).toBe(true);
});

test("questionnaire schema rejects duplicate option ids and invalid selection bounds", () => {
  const duplicate = questionnaireSchema.safeParse({
    id: "broken",
    version: 1,
    intro: { eyebrow: "Q", title: "T", subtitle: "S", welcome: "W" },
    completionMessages: ["One", "Two"],
    questions: [{
      id: "q1",
      type: "multiple_choice",
      message: "Pick",
      options: [options[0], options[0]],
      minSelections: 2,
      maxSelections: 1,
    }],
  });
  expect(duplicate.success).toBe(false);
});

test("answer parsing validates membership, trimming, and multiple-choice limits", () => {
  const multi = {
    id: "topics",
    type: "multiple_choice" as const,
    message: "Which topics?",
    options,
    minSelections: 1,
    maxSelections: 2,
  };
  expect(parseAnswerForQuestion(multi, ["founders", "operators"])).toEqual(["founders", "operators"]);
  expect(() => parseAnswerForQuestion(multi, ["missing"])).toThrow();
  expect(() => parseAnswerForQuestion(multi, [])).toThrow();
  expect(() => parseAnswerForQuestion({ id: "work", type: "text", message: "Work?", required: true }, "   ")).toThrow();
});

test("session schema rejects malformed persisted conversation", () => {
  expect(sessionSchema.safeParse({ questionnaireId: "x", questionnaireVersion: 1 }).success).toBe(false);
});
```

- [ ] **Step 3: Run schema tests to verify RED**

Run: `rtk bun test src/features/questionnaire/schemas/questionnaire.schema.test.ts`

Expected: FAIL because the schema module does not exist.

- [ ] **Step 4: Implement the schemas and inferred types**

Implement a Zod discriminated union with refinements and export types from `questionnaire.types.ts`:

```ts
// questionnaire.types.ts
import type { z } from "zod";
import type {
  conversationItemSchema,
  optionSchema,
  questionSchema,
  questionnaireResultSchema,
  questionnaireSchema,
  sessionSchema,
} from "../schemas/questionnaire.schema";

export type Option = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export type ConversationItem = z.infer<typeof conversationItemSchema>;
export type QuestionnaireSession = z.infer<typeof sessionSchema>;
export type QuestionnaireResult = z.infer<typeof questionnaireResultSchema>;
export type AnswerValue = string | string[];
export type ConversationPhase =
  | "weft_typing"
  | "awaiting_answer"
  | "submitting_answer"
  | "transitioning"
  | "completed";
export type SubmitAnswerInput = { questionId: string; value: AnswerValue };
```

In `questionnaire.schema.ts`, define `optionSchema`, a four-way `questionSchema`, intro/completion configuration, conversation items, and a versioned session:

```ts
export const conversationItemSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("question"), questionId: z.string().min(1), content: z.string().min(1) }),
  z.object({ id: z.string().min(1), type: z.literal("answer"), questionId: z.string().min(1), value: z.union([z.string(), z.array(z.string())]), display: z.string().min(1) }),
]);

export const sessionSchema = z.object({
  questionnaireId: z.string().min(1),
  questionnaireVersion: z.number().int().positive(),
  conversation: z.array(conversationItemSchema),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  currentQuestionIndex: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: z.string().datetime(),
});
```

`parseAnswerForQuestion` must trim text/Other input, reject values not present in `question.options`, reject repeated multiple-choice values, and enforce `minSelections`/`maxSelections`.

- [ ] **Step 5: Run schema tests to verify GREEN**

Run: `rtk bun test src/features/questionnaire/schemas/questionnaire.schema.test.ts`

Expected: PASS.

- [ ] **Step 6: Write the failing mock-data test**

```ts
import { expect, test } from "bun:test";
import { questionnaireSchema } from "../schemas/questionnaire.schema";
import { mockQuestionnaire } from "./mockQuestionnaire";

test("mock networking questionnaire is valid and exercises all composer types", () => {
  expect(questionnaireSchema.parse(mockQuestionnaire)).toEqual(mockQuestionnaire);
  expect(new Set(mockQuestionnaire.questions.map((question) => question.type))).toEqual(
    new Set(["text", "single_choice", "multiple_choice", "hybrid"]),
  );
  expect(mockQuestionnaire.completionMessages).toEqual([
    "You’re all set.",
    "Thanks. We’ll use your answers to introduce you to the right people.",
  ]);
});
```

- [ ] **Step 7: Run the data test to verify RED**

Run: `rtk bun test src/features/questionnaire/data/mockQuestionnaire.test.ts`

Expected: FAIL because `mockQuestionnaire.ts` does not exist.

- [ ] **Step 8: Add the validated networking questionnaire**

Create five natural questions in this order: single-choice reason for attending, hybrid valuable people to meet, text current work, multiple-choice relevant topics with a two-selection minimum and four-selection maximum, and text help the attendee can offer. Export the object with `satisfies Questionnaire` and call `questionnaireSchema.parse` in the API before returning it.

- [ ] **Step 9: Run domain tests and commit**

Run: `rtk bun test src/features/questionnaire/schemas/questionnaire.schema.test.ts src/features/questionnaire/data/mockQuestionnaire.test.ts`

Expected: PASS.

```bash
rtk git add package.json bun.lock src/features/questionnaire/schemas src/features/questionnaire/types src/features/questionnaire/data
rtk git commit -m "feat(questionnaire): define validated questionnaire domain"
```

---

### Task 2: Resumable Mock API

**Files:**
- Create: `src/features/questionnaire/api/questionnaire.api.ts`
- Create: `src/features/questionnaire/api/questionnaire.api.test.ts`

**Interfaces:**
- Consumes: `mockQuestionnaire`, `questionnaireSchema`, `sessionSchema`, `parseAnswerForQuestion`, `SubmitAnswerInput`.
- Produces: `QuestionnaireStorage`, `createMemoryQuestionnaireStorage()`, `getQuestionnaire(storage?)`, `submitAnswer(input, storage?)`, `completeQuestionnaire(storage?)`, `QUESTIONNAIRE_STORAGE_KEY`, and canonical `{ questionnaire, session, isNewSession }` results.

- [ ] **Step 1: Write failing API tests with memory storage**

```ts
import { expect, test } from "bun:test";
import {
  completeQuestionnaire,
  createMemoryQuestionnaireStorage,
  getQuestionnaire,
  submitAnswer,
} from "./questionnaire.api";

test("getQuestionnaire creates a resumable opening conversation", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const first = await getQuestionnaire(storage);
  const resumed = await getQuestionnaire(storage);
  expect(first.isNewSession).toBe(true);
  expect(first.session.conversation.map((item) => item.type)).toEqual(["question", "question"]);
  expect(resumed.isNewSession).toBe(false);
  expect(resumed.session).toEqual(first.session);
});

test("submitAnswer persists the canonical answer and next Weft question", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);
  const firstQuestion = initial.questionnaire.questions[0];
  const option = firstQuestion.type === "single_choice" ? firstQuestion.options[0].value : "";
  const result = await submitAnswer({ questionId: firstQuestion.id, value: option }, storage);
  expect(result.session.answers[firstQuestion.id]).toBe(option);
  expect(result.session.currentQuestionIndex).toBe(1);
  expect(result.session.conversation.at(-2)?.type).toBe("answer");
  expect(result.session.conversation.at(-1)?.type).toBe("question");
});

test("submitAnswer rejects duplicate and out-of-order submissions", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);
  const question = initial.questionnaire.questions[1];
  let message = "";
  try {
    await submitAnswer({ questionId: question.id, value: "x" }, storage);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).toContain("active question");
});

test("completeQuestionnaire appends exact completion copy once", async () => {
  const storage = createMemoryQuestionnaireStorage();
  const initial = await getQuestionnaire(storage);
  for (const question of initial.questionnaire.questions) {
    const value = question.type === "multiple_choice"
      ? question.options.slice(0, question.minSelections ?? 1).map((option) => option.value)
      : question.type === "text"
        ? "A useful answer"
        : question.options[0].value;
    await submitAnswer({ questionId: question.id, value }, storage);
  }
  const completed = await completeQuestionnaire(storage);
  const repeated = await completeQuestionnaire(storage);
  expect(completed.session.completed).toBe(true);
  expect(repeated.session.conversation).toEqual(completed.session.conversation);
});

test("corrupt or version-incompatible storage restarts safely", async () => {
  const storage = createMemoryQuestionnaireStorage("not-json");
  expect((await getQuestionnaire(storage)).isNewSession).toBe(true);
});

test("unavailable storage falls back without breaking the active visit", async () => {
  const unavailable = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  };
  const result = await getQuestionnaire(unavailable);
  expect(result.session.currentQuestionIndex).toBe(0);
});
```

- [ ] **Step 2: Run API tests to verify RED**

Run: `rtk bun test src/features/questionnaire/api/questionnaire.api.test.ts`

Expected: FAIL because the API module does not exist.

- [ ] **Step 3: Implement the storage adapter and API**

Use an injectable two-method interface so tests never touch browser globals:

```ts
export type QuestionnaireStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const QUESTIONNAIRE_STORAGE_KEY = "weft:attendee-questionnaire:v1";

function browserStorage(): QuestionnaireStorage {
  const fallback = createMemoryQuestionnaireStorage();
  return {
    getItem(key) {
      try { return window.localStorage.getItem(key); } catch { return fallback.getItem(key); }
    },
    setItem(key, value) {
      try { window.localStorage.setItem(key, value); } catch { fallback.setItem(key, value); }
    },
  };
}
```

`getQuestionnaire` validates configuration, parses storage, verifies questionnaire ID/version, and creates a session containing the welcome item and first question when no valid session exists. `submitAnswer` requires the exact active question ID, calls `parseAnswerForQuestion`, appends one answer item and the next question if present, increments the index, and persists once. `completeQuestionnaire` requires all questions answered, appends the two completion messages once, marks the session complete, and persists.

Wrap injected storage with the same safe read/write behavior when its methods
throw, so the active in-memory visit still works. Use a short mock latency only
for the default browser adapter; injected memory storage in tests resolves
immediately. Export `questionnaireApi` and its `QuestionnaireApi` type so the
Query hook and mounted tests can inject the same three-operation contract.

- [ ] **Step 4: Run API tests to verify GREEN**

Run: `rtk bun test src/features/questionnaire/api/questionnaire.api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/features/questionnaire/api
rtk git commit -m "feat(questionnaire): add resumable mock api"
```

---

### Task 3: TanStack Query Binding and Architecture Guard

**Files:**
- Create: `src/features/questionnaire/hooks/useQuestionnaire.ts`
- Create: `src/features/questionnaire/hooks/useQuestionnaire.test.tsx`
- Modify: `tests/architecture.test.ts`

**Interfaces:**
- Consumes: the three mock API functions and `QuestionnaireResult`/`SubmitAnswerInput`.
- Produces: `QUESTIONNAIRE_QUERY_KEY` and `useQuestionnaire()` returning `result`, `isLoading`, `error`, `submitAnswer`, `completeQuestionnaire`, `isSubmitting`, and `retry`.

- [ ] **Step 1: Write failing architecture assertions**

Add a focused test:

```ts
test("attendee questionnaire owns a feature-based route and api boundary", () => {
  expect(existsSync(resolve(projectRoot, "src/app/questionnaire/page.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/questionnaire/components/Questionnaire.tsx"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/questionnaire/api/questionnaire.api.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/features/questionnaire/hooks/useQuestionnaire.ts"))).toBe(true);
  expect(existsSync(resolve(projectRoot, "src/app/api/questionnaire"))).toBe(false);
});
```

- [ ] **Step 2: Run the architecture test to verify RED**

Run: `rtk bun test tests/architecture.test.ts`

Expected: FAIL because the hook, route, and root component do not yet exist.

- [ ] **Step 3: Write the failing hook cache-update test**

Mount a test harness with `QueryClientProvider`, an injected API object, and reduced retry settings. Assert that the initial query result renders, calling `submitAnswer` updates the cached current index without a second `getQuestionnaire` call, and mutation errors remain exposed without discarding the original result.

```tsx
expect(screenText()).toContain("index:0");
await act(async () => harnessSubmit({ questionId: "reason", value: "connect" }));
expect(screenText()).toContain("index:1");
expect(getCalls).toBe(1);
```

- [ ] **Step 4: Run the hook test to verify RED**

Run: `rtk bun test src/features/questionnaire/hooks/useQuestionnaire.test.tsx`

Expected: FAIL because `useQuestionnaire.ts` does not exist.

- [ ] **Step 5: Implement the hook**

```ts
export const QUESTIONNAIRE_QUERY_KEY = ["attendee-questionnaire"] as const;

export function useQuestionnaire(api: QuestionnaireApi = questionnaireApi) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUESTIONNAIRE_QUERY_KEY, queryFn: api.getQuestionnaire });
  const submit = useMutation({
    mutationFn: api.submitAnswer,
    onSuccess: (result) => queryClient.setQueryData(QUESTIONNAIRE_QUERY_KEY, result),
  });
  const complete = useMutation({
    mutationFn: api.completeQuestionnaire,
    onSuccess: (result) => queryClient.setQueryData(QUESTIONNAIRE_QUERY_KEY, result),
  });
  return {
    result: query.data,
    isLoading: query.isPending,
    error: query.error ?? submit.error ?? complete.error,
    submitAnswer: submit.mutateAsync,
    completeQuestionnaire: complete.mutateAsync,
    isSubmitting: submit.isPending || complete.isPending,
    retry: query.refetch,
  };
}
```

- [ ] **Step 6: Add temporary route/component stubs only after the architecture test has failed**

Create the smallest compiling `Questionnaire.tsx` client boundary and `page.tsx` server route; both will be replaced test-first in later tasks:

```tsx
// page.tsx
import { Questionnaire } from "@/features/questionnaire/components/Questionnaire";
export default function QuestionnairePage() { return <Questionnaire />; }
```

```tsx
// Questionnaire.tsx
"use client";
export function Questionnaire() { return <main>Questionnaire loading…</main>; }
```

- [ ] **Step 7: Run hook and architecture tests to verify GREEN**

Run: `rtk bun test src/features/questionnaire/hooks/useQuestionnaire.test.tsx tests/architecture.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/features/questionnaire/hooks src/features/questionnaire/components/Questionnaire.tsx src/app/questionnaire/page.tsx tests/architecture.test.ts
rtk git commit -m "feat(questionnaire): bind api state with tanstack query"
```

---

### Task 4: Typewriter and Conversation Presentation

**Files:**
- Create: `src/features/questionnaire/components/TypewriterMessage.tsx`
- Create: `src/features/questionnaire/components/TypewriterMessage.test.tsx`
- Create: `src/features/questionnaire/components/ConversationItem.tsx`
- Create: `src/features/questionnaire/components/ConversationItem.test.tsx`
- Create: `src/features/questionnaire/components/Conversation.tsx`

**Interfaces:**
- Consumes: `ConversationItem`, active animated item ID, completion callback, `/icon.svg`, Motion `useReducedMotion`.
- Produces: `TypewriterMessage({ content, animate, onComplete, onProgress? })`, `ConversationItemView`, and `Conversation({ items, animatedItemId, onTypingComplete })`.

- [ ] **Step 1: Write failing typewriter behavior tests**

Use an isolated JSDOM mount with a configurable `characterDelayMs` test prop:

```tsx
test("new Weft text reveals progressively and completes once", async () => {
  render(<TypewriterMessage animate characterDelayMs={1} content="Hello." onComplete={onComplete} />);
  expect(container.textContent).not.toBe("Hello.");
  await waitFor(() => container.textContent === "Hello.");
  expect(completions).toBe(1);
});

test("old or reduced-motion text renders immediately", async () => {
  render(<TypewriterMessage animate={false} content="Already here" onComplete={onComplete} />);
  expect(container.textContent).toBe("Already here");
  expect(completions).toBe(1);
});

test("unmount clears pending character timers", async () => {
  render(<TypewriterMessage animate characterDelayMs={20} content="A longer message" onComplete={onComplete} />);
  unmount();
  await wait(50);
  expect(completions).toBe(0);
});
```

- [ ] **Step 2: Run typewriter tests to verify RED**

Run: `rtk bun test src/features/questionnaire/components/TypewriterMessage.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement progressive text revelation**

Use `useEffect`, one cancellable timeout at a time, `useReducedMotion`, and punctuation-aware delay clamped to a fast range. Preserve the full text in a visually hidden live-announcement node only after completion, while the progressively rendered span is `aria-hidden` during animation so assistive technology is not flooded character by character.

```tsx
const punctuationPause: Record<string, number> = { ".": 55, ",": 30, "?": 55, "!": 55, ":": 35 };
const delayFor = (character: string, index: number, base: number) =>
  base + (punctuationPause[character] ?? ((index * 7) % 9));
```

Call `onProgress` every 6 characters or on punctuation, not every character, to support gentle scroll following.

- [ ] **Step 4: Run typewriter tests to verify GREEN**

Run: `rtk bun test src/features/questionnaire/components/TypewriterMessage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing conversation-item presentation tests**

```tsx
test("Weft and attendee items use distinct branded semantics", () => {
  const weft = renderToStaticMarkup(<ConversationItemView animate={false} item={{ id: "q", type: "question", questionId: "reason", content: "Why are you here?" }} onTypingComplete={() => {}} />);
  const attendee = renderToStaticMarkup(<ConversationItemView animate={false} item={{ id: "a", type: "answer", questionId: "reason", value: "connect", display: "Meet thoughtful people" }} onTypingComplete={() => {}} />);
  expect(weft).toContain('src="/icon.svg"');
  expect(weft).toContain("Weft says");
  expect(attendee).toContain("Your answer");
  expect(attendee).not.toContain('src="/icon.svg"');
});
```

- [ ] **Step 6: Run the item test to verify RED**

Run: `rtk bun test src/features/questionnaire/components/ConversationItem.test.tsx`

Expected: FAIL because `ConversationItem.tsx` does not exist.

- [ ] **Step 7: Implement item presentation and scroll viewport**

Use Tailwind utilities for the asymmetrical reference composition: Weft items align left with a 40px mark and subtle border container; answers align right with a warm ember surface. `Conversation` renders a semantic ordered list, an end sentinel, and a near-bottom guard (`scrollHeight - scrollTop - clientHeight < 160`) before smooth-follow requests. It invokes follow on new items, throttled typewriter progress, and composer visibility; reduced motion uses `behavior: "auto"`.

- [ ] **Step 8: Run component tests and commit**

Run: `rtk bun test src/features/questionnaire/components/TypewriterMessage.test.tsx src/features/questionnaire/components/ConversationItem.test.tsx`

Expected: PASS.

```bash
rtk git add src/features/questionnaire/components/TypewriterMessage.tsx src/features/questionnaire/components/TypewriterMessage.test.tsx src/features/questionnaire/components/ConversationItem.tsx src/features/questionnaire/components/ConversationItem.test.tsx src/features/questionnaire/components/Conversation.tsx
rtk git commit -m "feat(questionnaire): add conversational message presentation"
```

---

### Task 5: Dynamic Question Composers

**Files:**
- Create: `src/features/questionnaire/components/TextComposer.tsx`
- Create: `src/features/questionnaire/components/SingleChoiceComposer.tsx`
- Create: `src/features/questionnaire/components/MultipleChoiceComposer.tsx`
- Create: `src/features/questionnaire/components/HybridComposer.tsx`
- Create: `src/features/questionnaire/components/QuestionComposer.tsx`
- Create: `src/features/questionnaire/components/QuestionComposer.test.tsx`
- Create: `src/features/questionnaire/components/QuestionComposer.interaction.mount.tsx`
- Create: `src/features/questionnaire/components/QuestionComposer.interaction.test.ts`

**Interfaces:**
- Consumes: `Question`, `AnswerValue`, `disabled`, `error`, and `onSubmit(value): Promise<void> | void`.
- Produces: four accessible composers and `QuestionComposer({ question, disabled, error, onSubmit })`.

- [ ] **Step 1: Write failing static discriminant tests**

Render `QuestionComposer` with one question of each type and assert:

```tsx
expect(textHtml).toContain('data-composer="text"');
expect(singleHtml).toContain('role="radiogroup"');
expect(singleHtml).not.toContain('type="text"');
expect(multipleHtml).toContain('role="group"');
expect(multipleHtml).toContain("Continue");
expect(hybridHtml).toContain("Other");
```

Also assert every option button has `aria-checked`, a visible label, and a focusable native button.

- [ ] **Step 2: Run static composer tests to verify RED**

Run: `rtk bun test src/features/questionnaire/components/QuestionComposer.test.tsx`

Expected: FAIL because the composer modules do not exist.

- [ ] **Step 3: Write failing mounted interaction tests**

In isolated JSDOM, cover the actual input behavior:

```tsx
test("text Enter trims and submits once", async () => {
  typeInto(textInput(), "  Building a climate hiring platform  ");
  pressEnter(textInput());
  await waitFor(() => submissions.length === 1);
  expect(submissions).toEqual(["Building a climate hiring platform"]);
});

test("single choice confirms briefly then submits exactly one value", async () => {
  clickOption("Meet collaborators");
  expect(option("Meet collaborators").getAttribute("aria-checked")).toBe("true");
  await waitFor(() => submissions.length === 1);
  expect(submissions).toEqual(["collaborators"]);
});

test("multiple choice enforces bounds and reveals Continue at minimum", async () => {
  expect(continueButton()).toBeNull();
  clickOption("Leadership");
  clickOption("AI & technology");
  expect(continueButton()).toBeTruthy();
  clickOption("Product");
  clickOption("Design");
  clickOption("Marketing");
  expect(checkedValues()).toHaveLength(4);
  clickContinue();
  expect(submissions[0]).toEqual(["leadership", "ai-tech", "product", "design"]);
});

test("hybrid Other reveals a required inline input", async () => {
  clickOption("Other");
  expect(otherInput()).toBeTruthy();
  expect(otherSubmit().disabled).toBe(true);
  typeInto(otherInput(), "  People working on public-interest AI  ");
  clickOtherSubmit();
  expect(submissions).toEqual(["People working on public-interest AI"]);
});
```

- [ ] **Step 4: Run mounted composer tests to verify RED**

Run: `rtk bun test src/features/questionnaire/components/QuestionComposer.interaction.test.ts`

Expected: FAIL because the mounted suite imports missing composer modules.

- [ ] **Step 5: Implement the four composers**

Use native buttons with radio/checkbox roles, `aria-checked`, a labelled fieldset/group, visible focus utilities, and 48px minimum targets. Each composer manages only its local draft or selected values. Multiple-choice refuses a fifth selection when `maxSelections` is four. Single-choice and predefined hybrid choices wait approximately 160ms after visual selection before `onSubmit`. Text and Other submissions retain their values when the promise rejects.

Focus the first meaningful control when each composer mounts: the text input for
text questions, the first option for choice questions, and the revealed Other
input when Other is selected. Do not move focus while Weft is typing.

Use Motion only for restrained opacity/`y: 6` composer entrance, option background/border changes, Other input reveal, and Continue entrance. When `disabled` is true, block handlers and expose `aria-disabled` or native `disabled` as appropriate.

- [ ] **Step 6: Implement the discriminated composer switch**

```tsx
export function QuestionComposer(props: QuestionComposerProps) {
  switch (props.question.type) {
    case "text": return <TextComposer {...props} question={props.question} />;
    case "single_choice": return <SingleChoiceComposer {...props} question={props.question} />;
    case "multiple_choice": return <MultipleChoiceComposer {...props} question={props.question} />;
    case "hybrid": return <HybridComposer {...props} question={props.question} />;
  }
}
```

- [ ] **Step 7: Run all composer tests to verify GREEN**

Run: `rtk bun test src/features/questionnaire/components/QuestionComposer.test.tsx src/features/questionnaire/components/QuestionComposer.interaction.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/features/questionnaire/components/TextComposer.tsx src/features/questionnaire/components/SingleChoiceComposer.tsx src/features/questionnaire/components/MultipleChoiceComposer.tsx src/features/questionnaire/components/HybridComposer.tsx src/features/questionnaire/components/QuestionComposer.tsx src/features/questionnaire/components/QuestionComposer.test.tsx src/features/questionnaire/components/QuestionComposer.interaction.mount.tsx src/features/questionnaire/components/QuestionComposer.interaction.test.ts
rtk git commit -m "feat(questionnaire): add dynamic accessible composers"
```

---

### Task 6: Conversational Orchestration, Route, and Weft Styling

**Files:**
- Modify: `src/features/questionnaire/components/Questionnaire.tsx`
- Create: `src/features/questionnaire/components/Questionnaire.interaction.mount.tsx`
- Create: `src/features/questionnaire/components/Questionnaire.interaction.test.ts`
- Modify: `src/app/questionnaire/page.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `useQuestionnaire`, `Conversation`, `QuestionComposer`, `ConversationPhase`, and Query client/provider.
- Produces: the complete `/questionnaire` experience, exact final copy, refresh-safe resume, branded loading/error states, and scoped questionnaire CSS.

- [ ] **Step 1: Write failing mounted end-to-end flow tests**

Use the memory storage API and reduced motion so messages complete immediately. Mount `Questionnaire` with an injectable API dependency and assert:

```tsx
test("controls appear only after Weft finishes and each answer advances the conversation", async () => {
  await openQuestionnaire();
  expect(activeComposer()).toBeTruthy();
  answerEveryQuestionWithValidData();
  await waitFor(() => document.body.textContent?.includes("You’re all set.") === true);
  expect(document.body.textContent).toContain("Thanks. We’ll use your answers to introduce you to the right people.");
  expect(session().completed).toBe(true);
});

test("submission failure preserves the active composer and does not append an answer", async () => {
  failNextSubmission(new Error("Connection lost"));
  chooseFirstOption();
  await waitFor(() => document.body.textContent?.includes("Couldn’t save that answer") === true);
  expect(activeComposer()).toBeTruthy();
  expect(answerItems()).toHaveLength(0);
});

test("remount resumes without replaying old Weft messages", async () => {
  await answerFirstQuestion();
  unmount();
  await openQuestionnaireWithSameStorage();
  expect(activeQuestionText()).toBe(questionnaire.questions[1].message);
  expect(activeComposer()).toBeTruthy();
  expect(typewriterAnimatedItems()).toHaveLength(0);
});
```

Add a non-reduced-motion test with a controlled short typewriter delay proving the composer is absent during text growth and enters only after `onTypingComplete`.

- [ ] **Step 2: Run the orchestration test to verify RED**

Run: `rtk bun test src/features/questionnaire/components/Questionnaire.interaction.test.ts`

Expected: FAIL because the root component is still a stub.

- [ ] **Step 3: Implement the state machine in `Questionnaire.tsx`**

Create a stable `QueryClient` with `useState`, `retry: 1`, and a five-minute
stale time. A loading/controller component calls `useQuestionnaire` and renders
`QuestionnaireFlow` only after a canonical result exists, so the flow's initial
state never captures `undefined`. `QuestionnaireFlow` derives the active
question from the canonical session and owns:

```ts
const [phase, setPhase] = useState<ConversationPhase>(
  result?.session.completed ? "completed" : result?.isNewSession ? "weft_typing" : "awaiting_answer",
);
const [animatedQueue, setAnimatedQueue] = useState<string[]>(
  result?.isNewSession ? result.session.conversation.filter((item) => item.type === "question").map((item) => item.id) : [],
);
```

On typewriter completion, dequeue the item. If another opening item remains, pause about 240ms then animate it. When the queue is empty, enter `awaiting_answer` or `completed`. On submit: set `submitting_answer`, await the mutation, set `transitioning`, pause about 220ms, identify the newly appended question item, enqueue only that ID, and enter `weft_typing`. After the final answer, call `completeQuestionnaire`, enqueue the two newly returned completion item IDs, and enter `completed` only after both finish.

While an animation queue contains more than one item, pass `Conversation` only
the canonical items that precede the queue plus the queue's first item. This
hides the next opening or completion message until the current message has
finished, while preserving both items durably for refresh recovery.

Guard every handler when phase is not `awaiting_answer` or a mutation is pending. Clear every timeout during cleanup.

- [ ] **Step 4: Implement loading, failure, header, conversation, and composer layout**

The route surface uses the reference hierarchy:

```tsx
<main className="questionnaire-shell">
  <header className="questionnaire-header">
    <img alt="" aria-hidden height={42} src="/icon.svg" width={42} />
    <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-ink/55">
      <span aria-hidden className="mr-2 text-ember">●</span> Weft questionnaire
    </p>
    <h1>Let’s get to know you <span aria-hidden className="text-ember">♡</span></h1>
    <p>This helps us introduce you to the right people in the room.</p>
  </header>
  <Conversation ... />
  <AnimatePresence mode="wait">{phase === "awaiting_answer" && <QuestionComposer ... />}</AnimatePresence>
</main>
```

Loading uses the existing mark and “Getting the conversation ready…” copy. Configuration/load errors show “We couldn’t open the questionnaire.” and a semantic Retry button. Submission errors render “Couldn’t save that answer. Please try again.” inside the active composer region.

- [ ] **Step 5: Add route metadata and scoped styling**

`page.tsx` exports:

```ts
export const metadata: Metadata = {
  title: "Attendee questionnaire | Weft",
  description: "Tell Weft who you would genuinely like to meet at the event.",
};
```

Add a scoped CSS layer to `globals.css` for `min-height: 100dvh`, `100svh` fallback, safe-area bottom padding, overscroll containment, the centered max-width column, a warm paper grain made only with subtle CSS radial gradients, the scroll mask, hidden scrollbar, and sticky bottom composer surface with `backdrop-filter`. Keep component colors/layout primarily in Tailwind utilities. Under `prefers-reduced-motion: reduce`, force `scroll-behavior: auto` and transition/animation duration near zero only inside `.questionnaire-shell`.

- [ ] **Step 6: Run orchestration test to verify GREEN**

Run: `rtk bun test src/features/questionnaire/components/Questionnaire.interaction.test.ts`

Expected: PASS.

- [ ] **Step 7: Run all questionnaire and architecture tests**

Run: `rtk bun test src/features/questionnaire tests/architecture.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/features/questionnaire/components/Questionnaire.tsx src/features/questionnaire/components/Questionnaire.interaction.mount.tsx src/features/questionnaire/components/Questionnaire.interaction.test.ts src/app/questionnaire/page.tsx src/styles/globals.css
rtk git commit -m "feat(questionnaire): ship conversational attendee flow"
```

---

### Task 7: Production Verification and Browser QA

**Files:**
- Modify only when a defect is observed: files under `src/features/questionnaire/`, `src/app/questionnaire/page.tsx`, `src/styles/globals.css`, and the matching failing test.

**Interfaces:**
- Consumes: complete `/questionnaire` route.
- Produces: verified keyboard-accessible, reduced-motion-safe, responsive, resumable experience.

- [ ] **Step 1: Run the complete automated verification suite**

Run each command independently and inspect the exit code:

```bash
rtk bun test
rtk bun run lint
rtk bun run build
rtk git diff --check
```

Expected: every command exits 0 with no new warnings or failures.

- [ ] **Step 2: Start the local development server**

Run: `rtk bun run dev -- --port 3001`

Expected: Next.js reports `http://localhost:3001` and stays running.

- [ ] **Step 3: Inspect responsive layouts in the browser**

Inspect `/questionnaire` at:

- phone: `390 × 844`;
- short phone: `360 × 740`;
- small laptop: `1280 × 800`;
- desktop: `1536 × 1024`.

Verify no navbar, no horizontal overflow, no phone-frame imitation, reference-like Weft identity, focused column, readable completed history, a reachable bottom composer above the safe area, and natural scrolling while messages grow. On desktop the conversation must remain narrow and intentionally mobile-derived.

- [ ] **Step 4: Complete all interaction and accessibility paths**

Verify text Enter/send, single-choice auto-submit, multiple-choice min/max and Continue, hybrid Other reveal and submit, exact two-message completion, full keyboard completion, visible focus, radio/checkbox announcement, and no composer while active Weft text is still typing.

Enable reduced motion and confirm every new Weft message appears immediately and nonessential transitions stop. Refresh after question two and after completion; verify accepted history and position survive, no old message retypes, and unsubmitted drafts do not survive.

- [ ] **Step 5: Correct observed defects test-first**

For every behavioral defect, add the smallest failing Bun test, run it to confirm the exact failure, patch production code, and rerun it to green. For a purely visual defect, change only the scoped questionnaire styles or utilities and repeat the viewport that exposed it.

- [ ] **Step 6: Run fresh final verification**

```bash
rtk bun test
rtk bun run lint
rtk bun run build
rtk git diff --check
rtk git status --short
```

Expected: tests, lint, build, and diff check exit 0; status contains only intentional questionnaire changes plus the two preserved unrelated untracked paths.

- [ ] **Step 7: Commit QA corrections when present**

Stage only exact questionnaire files and matching tests, then commit:

```bash
rtk git commit -m "fix(questionnaire): polish responsive conversation"
```
