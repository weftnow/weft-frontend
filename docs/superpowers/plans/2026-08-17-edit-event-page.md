# Edit Event On Its Own Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move editing an event out of an inline card on the Overview tab and onto its own screen at `/organizer/events/{eventId}/edit`, reached from a control in the top-right of the event header.

**Architecture:** The five event tab segments move into a `(tabs)` route group so the shared header layout stops wrapping the whole event subtree; the new `edit` segment then renders outside it, full-width, mirroring `/organizer/events/new`. `EventHeader` gains one optional href prop rendered into its already-declared but empty third grid column. `EventDetailsCard` sheds its embedded form and becomes read-only server-rendered markup. `CreateEventForm` itself is not modified.

**Tech Stack:** Next.js 16 App Router (React 19 server components), TypeScript, Zod 4, CSS Modules, Bun test with JSDOM.

**Spec:** `docs/superpowers/specs/2026-08-17-edit-event-page-design.md`

## Global Constraints

- Every existing organizer URL must resolve exactly as it does today. `(tabs)` is a route group: round-bracket folders contribute no path segment.
- `src/features/organizer-dashboard/components/CreateEventForm.tsx` is not modified by any task in this plan. Its fields, validation, layout, submit path and default save handler stay exactly as they are.
- No backend change. No change to `/v1/events` or its update endpoint.
- No new test file. Edit-mode coverage goes into the existing `src/features/organizer-dashboard/components/CreateEventForm.mount.tsx`, which is driven by `CreateEventForm.interaction.test.ts`.
- Only an event whose state is `"open"` may be edited. The helper is `acceptsResponses` from `src/features/organizer-dashboard/model/eventState.model.ts`.
- Commands: `bun test` runs the suite, `bun run lint` runs ESLint, `bun run build` runs the production build. Run from `/Users/shearytan/Documents/SurnX/web-frontend`.
- Work happens on the existing branch `feat/create-event-detail-and-editing`.

---

### Task 1: Cover edit mode in the mounted form suite

The mounted suite proves the create path only — all seven existing cases mount `CreateEventForm` in its default mode and stub `updateEvent` without ever reaching it. Editing is about to become the app's only editing surface, so it needs coverage before anything moves. Nothing in this task changes production code; it pins down behaviour the later tasks must not break.

**Files:**
- Modify: `src/features/organizer-dashboard/components/CreateEventForm.mount.tsx` (add a fixture and a mount helper after line 111, then four tests at the end)

**Interfaces:**
- Consumes: `CreateEventForm` from `./CreateEventForm` — props `{ mode?: "create" | "edit"; event?: EventSummaryRow; client?: CreateEventClient; heading?: string | null; onCreated?: (event: EventSummaryRow) => void }`. `CreateEventClient` is `{ createEvent(body: EventCreateBody): Promise<EventSummaryRow>; updateEvent(eventId: string, body: EventUpdateBody): Promise<EventSummaryRow> }`. `DashboardClientError` from `../api/client/dashboard.client` takes one code: `"unauthorized" | "planRequired" | "unavailable" | "conflict"`.
- Produces: nothing consumed by later tasks. Existing helpers `wait`, `waitFor`, `buttonNamed`, `nameField`, `setInput` and the `CREATED` fixture are reused as-is.

- [ ] **Step 1: Write the failing tests**

Add the `EventUpdateBody` type to the existing type-only import on line 4 so it reads:

```tsx
import type {
  EventCreateBody,
  EventSummaryRow,
  EventUpdateBody,
} from "../schemas/dashboard.schema";
```

Add this import beneath the existing `const { CreateEventForm } = await import("./CreateEventForm");` on line 40:

```tsx
const { DashboardClientError } = await import("../api/client/dashboard.client");
```

Add this fixture and helper immediately after the `withForm` helper ends on line 111:

```tsx
/** An event as the backend returns it, with every optional field populated. */
const STORED: EventSummaryRow = {
  id: "e9",
  name: "Founder Night",
  state: "open",
  starts_at: "2026-09-01T17:00:00Z",
  ends_at: "2026-09-01T20:00:00Z",
  timezone: "America/Bogota",
  location: "Casa Club, Bogotá",
  description: "An evening for founders.",
  capacity: 24,
  group_size_target: 6,
  form_token: "abc123",
};

/**
 * The same harness as withForm, in edit mode. Separate rather than a flag,
 * because the two modes take different clients and assert different calls —
 * one helper serving both would need a branch in every line of it.
 */
async function withEditForm(
  updateEvent: (eventId: string, body: EventUpdateBody) => Promise<EventSummaryRow>,
  run: (container: HTMLElement) => Promise<void>,
  onCreated: (event: EventSummaryRow) => void = () => {},
) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(
      <CreateEventForm
        client={{ createEvent: async () => CREATED, updateEvent }}
        event={STORED}
        mode="edit"
        onCreated={onCreated}
      />,
    );
  });
  try {
    await run(container);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}
```

Add these four tests at the end of the file:

```tsx
test("the edit form opens holding what the event already says", async () => {
  await withEditForm(
    async () => STORED,
    async (container) => {
      expect(nameField(container).value).toBe("Founder Night");
      expect(
        container.querySelector<HTMLInputElement>('input[name="location"]')!.value,
      ).toBe("Casa Club, Bogotá");
      expect(
        container.querySelector<HTMLInputElement>('input[name="capacity"]')!.value,
      ).toBe("24");
      expect(
        container.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!
          .value,
      ).toBe("An evening for founders.");
      // Table size is fixed once the room has been scored for it, so the
      // stored six shows and the whole group is disabled rather than absent —
      // a missing control cannot explain why it is missing.
      expect(
        container.querySelector<HTMLInputElement>(
          'input[name="group_size_target"][value="6"]',
        )!.checked,
      ).toBe(true);
      // Asserted on the fieldset, not on a radio inside it: `.disabled` on an
      // input reflects that input's own attribute, so a radio sitting in a
      // disabled fieldset still reports false. The form has exactly one
      // fieldset and this is it.
      expect(
        container.querySelector<HTMLFieldSetElement>("fieldset")!.disabled,
      ).toBe(true);
    },
  );
});

test("saving sends the edited values to the event's own id", async () => {
  const calls: { eventId: string; body: EventUpdateBody }[] = [];
  let saved: EventSummaryRow | null = null;
  await withEditForm(
    async (eventId, body) => {
      calls.push({ eventId, body });
      return STORED;
    },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night II"));
      await act(async () => buttonNamed(container, "Save changes").click());
      await waitFor(() => saved !== null);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.eventId).toBe("e9");
      expect(calls[0]?.body.name).toBe("Founder Night II");
      expect(calls[0]?.body.location).toBe("Casa Club, Bogotá");
      expect(calls[0]?.body.capacity).toBe(24);
      // Table size is not the update body's to carry — it cannot change, and
      // sending it would invite a PATCH that silently reseats the room.
      expect("group_size_target" in calls[0]!.body).toBe(false);
    },
    (event) => { saved = event; },
  );
});

test("a failed save keeps what was typed", async () => {
  await withEditForm(
    async () => { throw new DashboardClientError("unavailable"); },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night II"));
      await act(async () => buttonNamed(container, "Save changes").click());
      await waitFor(() => container.querySelector('[role="alert"]') !== null);
      expect(nameField(container).value).toBe("Founder Night II");
      expect(buttonNamed(container, "Save changes").hasAttribute("disabled"))
        .toBe(false);
    },
  );
});

test("an event that locked mid-edit says so, rather than reading as a failure", async () => {
  await withEditForm(
    async () => { throw new DashboardClientError("conflict"); },
    async (container) => {
      await act(async () => setInput(nameField(container), "Founder Night II"));
      await act(async () => buttonNamed(container, "Save changes").click());
      await waitFor(() => container.querySelector('[role="alert"]') !== null);
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "This event has locked — its details are fixed now.",
      );
    },
  );
});
```

- [ ] **Step 2: Run the tests to verify they pass against today's form**

Run: `bun test src/features/organizer-dashboard/components/CreateEventForm.interaction.test.ts`

Expected: PASS. These are characterisation tests over behaviour `CreateEventForm` already has — they are not driving new production code, they are pinning existing behaviour so the later tasks cannot break it silently.

If any case fails, the form does not behave as the spec assumed. Stop and report which assertion failed rather than editing `CreateEventForm` to satisfy it — that file is off-limits under Global Constraints.

- [ ] **Step 3: Commit**

```bash
git add src/features/organizer-dashboard/components/CreateEventForm.mount.tsx
git commit -m "test(dashboard): pin down what edit mode already does"
```

---

### Task 2: Give the event header an optional action slot

The header's grid already declares three columns (`auto minmax(0, 1fr) auto` at `Dashboard.module.css:197`) and fills only two. This task fills the third, without yet deciding what links there.

**Files:**
- Modify: `src/features/organizer-dashboard/components/EventHeader.tsx`
- Modify: `src/features/organizer-dashboard/components/Dashboard.module.css` (add `.headerAction` beside `.back`, which ends at line 220)

**Interfaces:**
- Consumes: `ArrowLeftIcon` from `./icons`, `formatEventDate` from `../model/eventDate.model`, `EventState` from `../model/eventState.model` — all already imported by this file.
- Produces: `EventHeader` gains one optional prop, `editHref?: string | null`. Task 3 passes it. When it is `null` or absent the header renders exactly as it does today.

- [ ] **Step 1: Add the prop and the link**

In `EventHeader.tsx`, add `editHref` to both the destructured parameters and the type. The parameter list becomes:

```tsx
export function EventHeader({
  name,
  state,
  startsAt,
  endsAt,
  location,
  submitted,
  editHref = null,
}: {
  name: string;
  state: EventState | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  submitted: number | null;
  /**
   * Where the edit screen lives, or null when this event cannot be edited.
   * Decided by the caller from the event's state rather than here: a locked
   * event answers 409 to any edit, and a control that cannot work is worse
   * than no control.
   */
  editHref?: string | null;
}) {
```

Insert the link directly after the closing `</div>` of `.eventTitleRow` and before the `{date || location || responses ? (` block:

```tsx
      {/*
        The third column of .eventHeader's grid, which has been declared and
        empty since the header was written. It sits opposite the back arrow
        because left means leave and right means act on this event — two icons
        sharing the left corner would make the organizer work out which is
        which. Text rather than a pencil: there is no pencil in ./icons, and a
        labelled control needs no legend.
      */}
      {editHref ? (
        <Link className={styles.headerAction} href={editHref}>
          Edit event
        </Link>
      ) : null}
```

- [ ] **Step 2: Add the style**

In `Dashboard.module.css`, immediately after the `.back svg` rule on line 220, add:

```css
/* The header's third grid column. Quieter than .newEventButton on the events
   list: creating an event is that screen's whole purpose, editing one is not,
   so this borrows .secondaryAction's outline rather than the ink fill. No
   self-alignment — the grid's `align-items: start` already sets it against
   the title. */
.headerAction {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border: 1px solid var(--dash-line-firm);
  border-radius: 999px;
  padding: 0.5rem 1.15rem;
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.headerAction:hover {
  border-color: var(--color-ink);
  background: rgb(18 18 18 / 3%);
}

.headerAction:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-signal) 70%, white);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Verify nothing regressed**

Run: `bun test && bun run lint`

Expected: PASS. No test mounts `EventHeader`, and the new prop defaults to `null`, so every existing render is byte-identical.

- [ ] **Step 4: Commit**

```bash
git add src/features/organizer-dashboard/components/EventHeader.tsx src/features/organizer-dashboard/components/Dashboard.module.css
git commit -m "feat(dashboard): give the event header an optional action slot"
```

---

### Task 3: Move the tab pages into a route group

The event layout draws the header and wraps everything beneath the event. An edit page nested under it would inherit that header — including, after Task 2 is wired up, a control pointing at the page the organizer is already standing on. A route group scopes the layout to the tabs only.

Nothing changes on screen and no URL changes. This task is a pure move, done on its own so a reviewer can confirm that claim without reading feature work.

**Files:**
- Move: `src/app/organizer/events/[eventId]/layout.tsx` → `src/app/organizer/events/[eventId]/(tabs)/layout.tsx`
- Move: `src/app/organizer/events/[eventId]/overview/` → `src/app/organizer/events/[eventId]/(tabs)/overview/`
- Move: `src/app/organizer/events/[eventId]/live/` → `src/app/organizer/events/[eventId]/(tabs)/live/`
- Move: `src/app/organizer/events/[eventId]/attendees/` → `src/app/organizer/events/[eventId]/(tabs)/attendees/`
- Move: `src/app/organizer/events/[eventId]/groups/` → `src/app/organizer/events/[eventId]/(tabs)/groups/`
- Move: `src/app/organizer/events/[eventId]/outcomes/` → `src/app/organizer/events/[eventId]/(tabs)/outcomes/`
- Unchanged and deliberately left in place: `src/app/organizer/events/[eventId]/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `src/app/organizer/events/[eventId]/edit/` becomes a location that renders without the event header. Task 5 fills it.

- [ ] **Step 1: Move the files**

```bash
cd /Users/shearytan/Documents/SurnX/web-frontend
mkdir -p "src/app/organizer/events/[eventId]/(tabs)"
git mv "src/app/organizer/events/[eventId]/layout.tsx" "src/app/organizer/events/[eventId]/(tabs)/layout.tsx"
for tab in overview live attendees groups outcomes; do
  git mv "src/app/organizer/events/[eventId]/$tab" "src/app/organizer/events/[eventId]/(tabs)/$tab"
done
```

`page.tsx` stays at `[eventId]/page.tsx`. It owns the bare event URL and must keep owning it — moving it inside `(tabs)` would leave that URL claimed by the group instead, and it only redirects to the landing tab, so it never renders under any layout anyway.

- [ ] **Step 2: Add a note recording why the group exists**

Every import inside the moved files uses the `@/` alias, so none of them needs rewriting. What is not obvious to the next reader is why the folder exists at all. Add this to the top of `(tabs)/layout.tsx`, above the existing imports:

```tsx
/*
 * The (tabs) group exists so this layout stops wrapping the whole event
 * subtree. /edit needs a screen of its own — the form is two panes and does
 * not belong under a header carrying a link to itself — and a layout applies
 * to every descendant, so the only way to leave one segment out is to move
 * the rest in. Round-bracket folders contribute no path segment: every URL
 * beneath /organizer/events/{id} is exactly what it was before the move.
 */
```

- [ ] **Step 3: Verify no URL moved**

Run: `bun test && bun run lint && bun run build`

Expected: PASS, and the build's route listing shows `/organizer/events/[eventId]/overview`, `/live`, `/attendees`, `/groups` and `/outcomes` unchanged, with no `(tabs)` segment in any printed path.

Read the printed route table before continuing. If `(tabs)` appears in any route, the folder was not named with literal round brackets and the move must be redone.

- [ ] **Step 4: Commit**

```bash
git add -A "src/app/organizer/events/[eventId]"
git commit -m "refactor(dashboard): scope the event layout to the tabs that need it"
```

---

### Task 4: Reduce EventDetailsCard to what it displays

With editing moving to its own screen, the card keeps only what it shows. It stops being a browser-side component: no state, no form, no button.

**Files:**
- Modify: `src/features/organizer-dashboard/components/EventDetailsCard.tsx` (rewrite)
- Modify: `src/app/organizer/events/[eventId]/(tabs)/overview/page.tsx:70` (drop the `editable` prop)
- Modify: `src/features/organizer-dashboard/components/Dashboard.module.css:937-940` (delete a rule left with no subject)

**Interfaces:**
- Consumes: `EventSummaryRow` from `../schemas/dashboard.schema`.
- Produces: `EventDetailsCard` takes exactly one prop, `{ event: EventSummaryRow }`. The `editable` prop is gone. No later task depends on this.

- [ ] **Step 1: Rewrite the card**

Replace the whole of `EventDetailsCard.tsx` with:

```tsx
import type { EventSummaryRow } from "../schemas/dashboard.schema";
import styles from "./Dashboard.module.css";

/**
 * What the organizer typed, read back to them.
 *
 * This used to hold the way in to changing it too — a button that swapped the
 * card's contents for the whole two-pane CreateEventForm, inside one column of
 * a grid, with the rest of the tab still on screen around it. Editing now has
 * a screen of its own and one entry point, in the event header, so the card is
 * only what it displays. No state left, so no "use client" either.
 */
export function EventDetailsCard({ event }: { event: EventSummaryRow }) {
  return (
    <section className={`${styles.card} ${styles.wide}`}>
      <h2>Event details</h2>
      {event.description ? (
        <p className={styles.caption}>{event.description}</p>
      ) : null}
      <p className={styles.caption}>
        {/* "Unlimited" is real information about how the room is run, not an
            empty state — so it prints rather than being hidden. */}
        {event.capacity ? `${event.capacity} seats` : "Unlimited seats"}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Drop the prop at the call site**

In `(tabs)/overview/page.tsx`, the block at lines 69-71 currently reads:

```tsx
        {event ? (
          <EventDetailsCard editable={acceptsResponses(event.state)} event={event} />
        ) : null}
```

Replace it with:

```tsx
        {event ? <EventDetailsCard event={event} /> : null}
```

Leave the `acceptsResponses` import alone — line 65 still calls it to decide whether to show `ShareFormLink`.

- [ ] **Step 3: Delete the orphaned style rule**

In `Dashboard.module.css`, delete this comment and rule (lines 937-940). Its only subject was the button just removed, and `.secondaryAction` has no other direct child of `.card`:

```css
/* EventDetailsCard's "Edit event" / "Cancel" sit directly in the card rather
   than inside .actionRow — the card holds a single action, not a pair — so it
   still needs its own space above the copy or the form that precedes it. */
.card > .secondaryAction { margin-top: 1rem; }
```

Before deleting, confirm nothing else relies on it:

```bash
grep -rn "secondaryAction" src/features/organizer-dashboard/components/*.tsx
```

Expected: hits only in components that place `.secondaryAction` inside `.actionRow`, never as a direct child of `.card`. If any component does put one directly in a card, keep the rule and drop only the sentence naming `EventDetailsCard` from its comment.

- [ ] **Step 4: Verify**

Run: `bun test && bun run lint && bun run build`

Expected: PASS. Nothing references `EventDetailsCard` from a test, and TypeScript will catch the call site if the prop was missed.

- [ ] **Step 5: Commit**

```bash
git add src/features/organizer-dashboard/components/EventDetailsCard.tsx "src/app/organizer/events/[eventId]/(tabs)/overview/page.tsx" src/features/organizer-dashboard/components/Dashboard.module.css
git commit -m "refactor(dashboard): the event details card is what it displays"
```

---

### Task 5: Build the edit screen

**Files:**
- Create: `src/app/organizer/events/[eventId]/edit/page.tsx`

**Interfaces:**
- Consumes: `readOrganizerSession` from `@/features/organizer-auth/api/server/organizerSession` (returns `Promise<string | null>`); `loadEvent(eventId, token)` from `@/features/organizer-dashboard/api/server/event.server` (returns `Promise<DashboardOutcome<unknown>>`, whose `status` is `"ok" | "unauthorized" | ...`); `eventSummaryRowSchema` from `@/features/organizer-dashboard/schemas/dashboard.schema`; `acceptsResponses` from `@/features/organizer-dashboard/model/eventState.model`; `CreateEventForm` from `@/features/organizer-dashboard/components/CreateEventForm`; the `.newEventPage` and `.backLink` classes from `Dashboard.module.css` and `.dashboardPlaceholder` from `OrganizerAuth.module.css`.
- Produces: the route `/organizer/events/{eventId}/edit`. Task 6 links to it.

- [ ] **Step 1: Write the page**

Create `src/app/organizer/events/[eventId]/edit/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readOrganizerSession } from "@/features/organizer-auth/api/server/organizerSession";
import { loadEvent } from "@/features/organizer-dashboard/api/server/event.server";
import { CreateEventForm } from "@/features/organizer-dashboard/components/CreateEventForm";
import { acceptsResponses } from "@/features/organizer-dashboard/model/eventState.model";
import { eventSummaryRowSchema } from "@/features/organizer-dashboard/schemas/dashboard.schema";
import authStyles from "@/features/organizer-auth/components/OrganizerAuth.module.css";
import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Edit event | Weft",
  description: "Change a Weft event's details.",
  robots: { index: false, follow: false },
};

/**
 * Changing an event, on its own screen.
 *
 * Overview used to reveal this form inside one card of its grid, with the
 * numbers and charts still around it. That was the same mistake the create
 * flow made and undid: the form is two panes plus a settings rail, which is
 * more than a card in a column can hold at a readable width.
 *
 * It sits outside the (tabs) group, so it gets no event header and no tab bar
 * — a header carrying a link to this very page helps nobody, and a tab bar
 * invites the organizer to wander off mid-edit.
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const token = await readOrganizerSession();
  if (!token) redirect("/organizer/login");

  // Unlike the create screen there is something to fetch here — the form opens
  // holding what the event already says, so it cannot render until that
  // arrives.
  const outcome = await loadEvent(eventId, token);
  if (outcome.status === "unauthorized") redirect("/organizer/login");
  if (outcome.status !== "ok") redirect(`/organizer/events/${eventId}/overview`);

  const parsed = eventSummaryRowSchema.safeParse(outcome.data);
  if (!parsed.success) redirect(`/organizer/events/${eventId}/overview`);

  // Locking is what fixes an event's details, and the backend answers 409 to
  // any edit after it. The header stops offering the link at that point, but
  // this URL is typeable and bookmarkable, so it needs its own answer.
  if (!acceptsResponses(parsed.data.state)) {
    redirect(`/organizer/events/${eventId}/overview`);
  }

  return (
    <main className={authStyles.dashboardPlaceholder}>
      <div className={styles.newEventPage}>
        <Link className={styles.backLink} href={`/organizer/events/${eventId}`}>
          ← Back to event
        </Link>
        {/*
          No onCreated: the form's default already navigates to the event,
          which routes on to whichever tab suits its state. That is the same
          landing the create screen gets, and it retires the reload() the card
          used to do.
        */}
        <CreateEventForm event={parsed.data} mode="edit" />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the route builds and renders bare**

Run: `bun test && bun run lint && bun run build`

Expected: PASS, and `/organizer/events/[eventId]/edit` appears in the build's route listing.

- [ ] **Step 3: Check it in the browser**

Run `bun run dev`, log in as an organizer, and open `/organizer/events/<an open event id>/edit` directly.

Confirm: both form panes render at full width with no event header and no tab bar above them; the fields hold the event's stored values; "← Back to event" returns without saving; and opening the same URL for a locked event lands on that event's Overview instead.

- [ ] **Step 4: Commit**

```bash
git add "src/app/organizer/events/[eventId]/edit/page.tsx"
git commit -m "feat(dashboard): editing an event gets a screen of its own"
```

---

### Task 6: Point the header at the edit screen

The last wire. Until this task the edit screen exists but nothing links to it, and Overview offers no way to edit at all.

**Files:**
- Modify: `src/app/organizer/events/[eventId]/(tabs)/layout.tsx`

**Interfaces:**
- Consumes: `EventHeader`'s `editHref?: string | null` prop from Task 2; `acceptsResponses` from `@/features/organizer-dashboard/model/eventState.model`; the route from Task 5.
- Produces: nothing. This is the terminal task.

- [ ] **Step 1: Pass the href**

Add `acceptsResponses` to the layout's imports:

```tsx
import { acceptsResponses } from "@/features/organizer-dashboard/model/eventState.model";
```

The layout already parses the event into `event` (a Zod `safeParse` result) before rendering. Add the `editHref` prop to the `<EventHeader>` element, keeping the existing props in their current alphabetical order:

```tsx
      <EventHeader
        editHref={
          // Only an open event can be edited: locking fixes its details and
          // the backend answers 409 to anything after. Offering a control
          // that cannot work is worse than offering none.
          event?.success && acceptsResponses(event.data.state)
            ? `/organizer/events/${eventId}/edit`
            : null
        }
        endsAt={event?.success ? event.data.ends_at ?? null : null}
        location={event?.success ? event.data.location ?? null : null}
        name={event?.success ? event.data.name : "Event"}
        startsAt={event?.success ? event.data.starts_at : null}
        state={event?.success ? event.data.state : null}
        submitted={summary?.success ? summary.data.submitted : null}
      />
```

- [ ] **Step 2: Verify**

Run: `bun test && bun run lint && bun run build`

Expected: PASS.

- [ ] **Step 3: Check the whole path in the browser**

Run `bun run dev` and, logged in as an organizer:

1. Open an **open** event's Overview. "Edit event" sits in the top-right of the header, opposite the back arrow. The Event details card shows description and capacity and offers no button.
2. Click it. The edit screen opens with the fields populated.
3. Change the name and click "Save changes". You land back on the event with the new name in the header.
4. Open a **locked** event's Overview. No "Edit event" control anywhere.
5. Narrow the window to phone width. The header's back arrow, title, state pill and the edit control all remain reachable and nothing overflows horizontally.
6. Confirm every tab — Overview, Live, and the locked Attendees / Groups / Outcomes — still loads at its original URL.

- [ ] **Step 4: Final verification**

```bash
bun test
bun run lint
bun run build
git diff --check
```

Expected: suite green, no lint errors, build succeeds, no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/organizer/events/[eventId]/(tabs)/layout.tsx"
git commit -m "feat(dashboard): the event header opens the edit screen"
```

---

## Out of Scope

Carried from the spec — do not do these:

- Any change to `CreateEventForm`'s fields, validation, layout or save behaviour.
- Any change to the backend event or update endpoints.
- Editing from the events list at `/organizer`.
- Editing anything a locked event still permits.
- Draft persistence or unsaved-change warnings on the edit screen.
- Restyling the event header beyond adding the one control.
