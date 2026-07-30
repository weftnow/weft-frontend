# Sender Return Link Design

## Goal

Give the sender a durable way back to their compatibility result. Today the only route back is the `weft_session` cookie: httpOnly, one browser, thirty days. Clearing cookies or switching devices makes the result permanently unreachable even though it still exists in the database, and the sender is the one person in the flow with no other path to it.

## The problem this solves

`GET /api/pair/{pair_id}` requires no authentication, so a per-pair URL already renders the full result without a cookie. Access is not the obstacle. The obstacle is that the sender never learns their `pair_id`: the pair is created when the responder answers and the id is returned only to the responder.

The timing compounds it. At the moment the sender would save something, they have just submitted and nobody has answered, so no pair exists to link to. Whatever they save must be an identifier they hold at share time that resolves to a pair later.

The invite token is the obvious candidate and is the wrong one. Invites are not single-use: `get_invite` never consumes them and there is no cap, so one invite can produce many pairs. More importantly the sender has already sent that token to their friend, so any sender-facing page keyed on it would be readable by everyone they invited.

## Concept

Every invite gains a sibling **return token**, minted at the same moment and never sent to the friend. The sender saves `/match/thread/<return_token>`, which resolves to the pair or pairs that invite produced.

Two tokens per invite: one outbound, which the friend uses to answer, and one inbound, which the sender uses to return. They are independent secrets, so forwarding the invite never exposes the sender's page.

The return link is scoped to an invite rather than to a session. A session-scoped token would expose every pair the sender belongs to; an invite-scoped one exposes only what that single invitation produced, which in the ordinary case is one pairing with one person. A sender who invites several people saves several links.

The cookie remains the primary path. This is a fallback, not a replacement.

## Backend: weft_core

`Invite` gains a `return_token` field, indexed for lookup in the same way `token` already is in `storage.py`. Both storage backends implement it.

`POST /api/invite` and the originator branch of `POST /api/answers` return `return_token` alongside `token`.

A new `GET /api/thread/{return_token}` returns `{"pairs": [...]}` for that invite, newest first, built from the existing `_pair_body` helper so the response shape matches `/api/session/{session_id}/pairs` exactly and the frontend can reuse its validator. Unknown token is 404.

The return token does not expire. Invites expire after `WEFT_INVITE_TTL_DAYS`, but inheriting that would mean a friend who answers on day twenty-nine leaves the sender a single day to look, which defeats the feature. The return token therefore outlives its invite and remains valid as long as the pair data it points at.

This is a deliberate tradeoff: the return link is a bearer URL with no expiry, so whoever holds it has permanent access to that pairing. It is accepted because the alternative — a link that dies while the result it points at still exists — fails at the one job the feature has.

## Frontend: web-frontend

`lib/links.ts` gains `threadHref(token)`. It already owns `INVITE_BASE` and `PAIR_BASE`, so shareable URL shapes stay in one module.

`lib/server/thread.ts` exposes `loadThread(returnToken)` returning `ok | not_found | unavailable`, modelled on `loadMyPairs` and reusing `isPairSummary` for validation. It takes the token as an argument rather than reading it from the request, matching the existing split where the page owns the read and the loader stays unit-testable.

`app/match/thread/[token]/page.tsx` renders the states. It is `force-dynamic` and carries `robots: { index: false, follow: false }`, for the same reason the invite and matches pages do: a bearer URL must never enter an index.

`ShareScreen` gains a quiet "Save your link" affordance beneath the invite link. The invite link remains the single obvious action; copying the return link takes deliberate intent, so the sender cannot casually send their private link in place of the invitation.

`content.ts` carries the copy for the affordance and for each page state.

## States

The thread page has five:

- **No pair yet** — nobody has answered. A waiting state via `CompatibilityNotice`.
- **One pair** — redirect to `/match/pair/<pair_id>`, so there is one canonical result URL rather than a second view of the same thing that could drift from it.
- **Several pairs** — the list, via `MatchesView`.
- **Unknown token** — not found, via `CompatibilityNotice`.
- **Backend unreachable** — unavailable, via `CompatibilityNotice`.

Every state reuses an existing component. No new presentational primitives.

## Copy correction in scope

`content.ts` currently tells the sender: "Keep this link. It's also how you come back to see your match." This is false. The share link is an invite; opening it renders the questionnaire, not a result. The line lives on the exact surface this feature changes and actively misdirects people, so it is corrected here rather than left for a separate pass.

## Verification

Unit tests for `loadThread` covering each outcome and a malformed payload, following `myPairs.test.ts`. A `threadHref` case in `links.test.ts`. Render tests for each thread page state, following the existing matches page tests. Backend tests for the new endpoint and for `return_token` appearing in both mint paths.

End to end, with two separate cookie jars: the sender submits, saves the return link, discards their cookie entirely, and still reaches the result after the responder answers. This is the scenario the feature exists for and the only one that proves it.

## Repository split

Backend and frontend change together, on a feature branch in each repository. The frontend depends on `return_token` and `GET /api/thread/{token}` existing, so weft_core lands first.
