# Practicum File-by-File Review Log

Working log of the file-by-file review/fix session on `develop` (branch: `fix/practicum-review`).
Purpose: hand this to the org's Claude.ai project (used by the 4 developers) as durable
context — what was reviewed, what was wrong, why, and what the fix pattern is, so future
PRs/agent sessions don't reintroduce the same bug classes.

Companion doc: [`docs/practicum-review.md`](practicum-review.md) has the full initial
survey (who-did-what, all findings). This file tracks the actual fix-by-fix walkthrough.

---

## Fixed

### 1. `server/src/controllers/contactMessageController.ts` — `addReply` (Malki, Contact feature)

**Bug:** IDOR / broken access control (high severity — live cross-tenant data leak).
`addReply` was the only handler in this controller that didn't check request ownership
before acting. `getRequestById` and `closeRequestById` both fetch the request first and
verify `isAdmin || request.userId === callerId` before proceeding; `addReply` skipped
straight to `contactMessageService.addReplyToRequest(...)` after only checking the caller
was logged in (not *whose* request they were replying to).

**Impact:** any authenticated user could POST a reply to another user's contact request by
guessing/enumerating its ID. The handler also echoed back the full `request` object in the
response, leaking that user's entire request/reply history.

**Fix:** added the same ownership check used by the sibling handlers — fetch the existing
request, return 404 if missing, return 403 if the caller is neither admin nor the request's
owner, only then call `addReplyToRequest`.

**Reusable lesson:** this codebase has a recurring pattern — one handler in a set of
otherwise-consistent handlers "forgets" the auth check (same root cause as the historical
org-module bugs: pending-org self-approval, remove-user IDOR). **When adding a new handler
to a resource-scoped controller, always match the ownership-check pattern of its siblings
in the same file — don't assume "logged in" is enough.**

---

## Fixed (cont'd)

### 2. `server/src/controllers/contactController.ts` — `submitContactForm` (Malki, Contact feature)

**Bug:** the contact-form message was saved to the DB (`saveMessage`) *before* sending the
notification email, but the email send wasn't isolated — if `sendContactEmail` threw (e.g.
mail provider outage), the whole request handler fell into the outer `catch` and returned
a 500 "failed to send" error to the user, even though their message had already been
persisted successfully. This risks confusing/duplicate submissions during any mail outage.

**Fix:** wrapped `sendContactEmail` in its own try/catch (best-effort, matching the pattern
already used for admin notification emails in the organizations feature) — a mail failure
is now logged but no longer fails the user-facing request.

**Reusable lesson:** whenever a side effect (email, webhook, etc.) happens *after* the
primary write already succeeded, treat it as best-effort with its own try/catch — don't
let it flip the whole request to a failure response.

---

### 6. `server/src/routes/organizationRouter.ts` (Esti, Organizations feature)

**Bug (medium/high, dead admin-only backdoor around status-transition validation):** the
route `PATCH /organizations/pending/:id` was wired to the generic `updateOrganizationHandler`.
That handler lets an admin caller update *any* field (`req.body` passed through verbatim
when `isAdmin`), including `status`/`walletBalance`/`isActive` — with none of the
transition validation, email notification, or "must currently be pending" checks that
`approveOrganization`/`rejectOrganization` (the dedicated, already-hardened endpoints) have.
This exact class of bug — a status field editable without transition validation — is one
of the ones already fixed once in this module.

Checked the client (`organizationApi.ts`, `config/api.ts`, `PendingOrganizationsPage.tsx`,
`PendingOrganizationsTable.tsx`) for any caller of this route: none exists. The frontend
only calls `GET /pending` (list) and the dedicated `approve(id)`/`reject(id)` endpoints,
confirming the org-approval flow was actually implemented via those hardened endpoints —
this route was simply dead, unused leftover wiring.

**Fix:** removed the route entirely (`router.patch("/pending/:id", ...)` deleted from
`organizationRouter.ts`); approve/reject remain the only way to change a pending org's status.

**Reusable lesson:** when a hardened, validated endpoint exists for a specific transition
(approve/reject), don't leave a generic update route also capable of reaching the same
field — even admin-only, it's a silent way to bypass validation that was deliberately
added elsewhere. Worth grepping the client for actual usage before assuming a route is load-bearing.

### 7. Remaining organization files — service/repo functions, model, and all client files (Esti + grinsh)

Reviewed and found clean, no action needed:
- **Service layer:** `approveOrganization`, `rejectOrganization`, `setOrganizationActive` (all have correct status-transition guards + best-effort owner email); `publicRequestOrganization` (validates email format, handles the org-name race via a DB unique-index + duplicate-key rollback that deletes the orphaned user); `removeUserFromOrganization`; `getOrganizationUsageSummary`/`listAllOrganizationsWithStats` (proper aggregation, no N+1).
- **`deleteOrganization`** (service-level, `organizationService.ts:58`) — correctly calls `userRepo.removeUsersFromOrganization(orgId)` (resets `organizationId`/downgrades `org_owner`→`user` for all members) *before* deleting the org document. (Initially misflagged this as a missing-cleanup bug by looking only at the repository-level `deleteOrganization`, which is DB-only by design — correcting the record here.)
- **`models/organization.ts`** — clean schema; noted `walletBalance` has no `min: 0`, but the only endpoint that can change it (`topUpOrganizationWalletHandler`) already rejects non-positive amounts, so it's not currently reachable. Low-priority defense-in-depth item only.
- **All 8 client files** under `client/src/features/organizations/**` (`OrganizationsManagement.tsx`, `OrganizationsList.tsx`, `OrganizationsTable.tsx`, `OrganizationDetail.tsx`, `PendingOrganizationsPage.tsx`, `PendingOrganizationsTable.tsx`, `PublicOrgOwnerSignup.tsx`, `PendingApprovalScreen.tsx`) — no client-only authorization logic anywhere (every sensitive action goes through a server endpoint that re-checks role/ownership), no XSS (no `dangerouslySetInnerHTML`, all rendering is plain React text interpolation), no secrets in client code. Temporary passwords for newly-created org members are shown/exported to Excel by design (server returns them once at creation) — not stored anywhere persistent client-side.

**Organizations (Esti + grinsh) file-by-file review: complete.**

### 9. `server/src/services/__tests__/newsService.test.ts` (Malki, AI News feature)

**Bug (test hygiene):** unlike `tenderBoardService.test.ts`, this file never mocked
`../../logger`. Every `logger.info`/`logger.error` call inside `newsService.ts` therefore
attempted a real MongoDB write during tests, which isn't available in the test
environment — each call hung for ~10s on a buffering-timeout error before being silently
swallowed. Tests still passed, but slowly and with noisy console output.

**Fix:** added `jest.mock("../../logger", () => ({ info: jest.fn(), error: jest.fn() }))`,
matching the pattern already used in `tenderBoardService.test.ts`. All 6 tests still pass,
now in ~1s with no console noise.

**Also reviewed, no action needed:** `newsService.ts`, `newsController.ts` (admin-only
gating on create/update/delete confirmed correct in `newsRouter.ts`), `newsRepository.ts`
(minor: `findById` doesn't pre-validate the ObjectId format, but an invalid id just
produces a normal 404 via the existing catch block, not a crash), `AiNewsPage.tsx` /
`AiNewsDetailsPage.tsx` (client-side `isAdmin` check is UI-only and correctly backed by
server-side `requireAdmin`; no `dangerouslySetInnerHTML` anywhere, all content rendered as
plain text; `document.title = news.title` is a safe property assignment, not HTML).

**Reusable lesson:** any service test that exercises a module calling the shared `logger`
should mock it, the same way DB/AI/email modules are already mocked — otherwise tests
silently depend on unavailable infrastructure and slow down for no benefit.

**Contact/News (Malki) file-by-file review: now fully complete** (server + client, all files).

## Reviewed, not yet fixed (pending)

### A. `server/src/services/organizationService.ts` — `addUserToOrganization` / `createOrganizationMember` (Esti, Organizations feature) — documented only, not fixed

**Bug (medium, TOCTOU race):** both functions do `countUsersByOrganization(orgId)` then
compare to `maxUsers`, then separately add the user — not atomic. Two concurrent
"add user" requests to the same org can both pass the count check and push the org over
its cap.

**Why not fixed now:** unlike the wallet balance, the user count isn't stored anywhere —
it's recomputed each time from the `User` collection, so there's no single field a simple
`$inc` can guard. A real fix needs either (a) a persisted `userCount` counter on the
`Organization` document, updated atomically together with add/remove-user (touches
`removeUserFromOrganization` too, to keep the counter in sync), or (b) MongoDB
transactions (requires a replica-set deployment — needs confirming before relying on it).
Decided to document this rather than make a schema change without the team present.

**Reusable lesson:** a "count rows, then compare to a limit" check is never atomic unless
the count itself is a field you can conditionally increment in one DB operation. When
enforcing a cap (`maxUsers`, quotas, etc.), prefer a persisted counter field with an atomic
conditional update over a live `COUNT`-then-insert.

### B. `server/src/controllers/organizationController.ts` (Esti, Organizations feature) — documented only, not fixed

**Not a live bug — a code-quality/consistency risk.** The ownership check:
```ts
const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;
if (user.role !== "admin" && ownerId.toString() !== user.userId) {
  return res.status(403).json({ error: "Access denied" });
}
```
is copy-pasted near-identically across 8 handlers (`get`, `update`, `getUsers`, `addUser`,
`createMember`, `addByEmail`, `removeUser`, `topUp`, `stats`). It's correct everywhere
today, but this exact shape — a handler-local check instead of shared middleware — is how
the previously-fixed bugs in this module happened (a new handler added without copying the
check). Recommend extracting an `isOwnerOrAdmin`/`requireOrgOwnerOrAdmin` helper (same
pattern now used in `tenderBoardController.ts`'s `isOwnerOrAdmin`, added this session).

Also minor: `listOrganizationsHandler` extracts the caller's id as
`user.userId || user.id || user._id`, while every other handler in this file uses
`user.userId` only. Not exploitable (fails closed), just inconsistent.

**Decision:** documented for a future cleanup pass rather than touched now, to keep this
session's diff focused on live bugs.

### 3. `server/src/services/contactMessageService.ts` + `server/src/repositories/contactMessageRepository.ts` (Malki)

**Good pattern worth reusing:** `repository.updateStatus` enforces ownership at the DB
query level too (`{ _id, userId }` filter when not admin), not just in the controller — a
true defense-in-depth pattern. `repository.addReplyToRequest` doesn't do this; it now
relies solely on the controller check we just added. Not urgent (controller check covers
it), but worth adopting the same DB-level filter here for consistency next time this file
is touched.

**Low:** no validation that `text` is non-empty before `addReplyToRequest` persists it —
an empty reply can be saved.

**Also reviewed, no action needed:** `contactTypeController.ts`/`contactTypeRoutes.ts`
(fine), `models/ContactMessage.ts` (fine, though `required: true` on reply `text` doesn't
reject empty strings), `contactRouter.ts` (auth/admin gating correct).

**Client-side (Malki):**
- `RequestDetails.tsx` — fine; React escapes rendered text (no XSS), server enforces auth.
  Minor UX: "close request" button still shown after the request is already closed.
- `AdminRequestsList.tsx` — fine, relies correctly on server-side `requireAdmin`.
- `MyRequestsList.tsx` — fine. Minor: filters out `status === 'closed'` requests entirely
  (`.filter((req) => req.status !== 'closed')`), so users have no way to see closed-request
  history. Possibly intentional — worth confirming with Malki.

**Contact/news (Malki) review: complete.**

---

### 3. `server/src/services/tenderBoardAIService.ts` + `tenderBoardService.ts` — smart search (Tamar, Tender Board feature)

**Bug 1 (medium/high, security):** `smartSearchTenders` passed the AI-generated Mongo
filter object almost straight into `repo.getTenders(filter)` (→ `Tender.find(filter)`),
with only an "is it a non-array object" check. A prompt-injection payload in the free-text
search box could coerce the model into emitting Mongo operators like `$where`/`$expr`
(arbitrary JS execution against the DB / blind-injection style probing / DoS), since the
schema (`z.record(z.string(), z.any())`) accepted arbitrary keys.

**Bug 2 (functional, found while fixing #1):** `AIService.generateSearchQuery` didn't just
build the filter — it *executed* `getTenders(...)` itself and returned the resulting tender
array. `smartSearchTenders` then treated that array as if it were the filter object and
passed it into `repo.getTenders(...)` a second time. Since an array fails the "non-array
object" check, this always fell back to `{}` — meaning **smart search silently ignored the
AI's filter and always returned every tender**, regardless of search text.

**Fix:**
- `generateSearchQuery` now only builds and returns the parsed filter object; it no longer
  calls `getTenders` itself.
- `smartSearchTenders` runs the returned filter through a new `sanitizeSearchFilter()`
  allowlist (only `title/shortDescription/productType/budget/timeRequired/
  aiApplicationType/additionalDetails` fields, only `$regex`/`$options`/`$or`/`$and`
  operators, recursively) before calling `repo.getTenders(safeFilter)` exactly once.

**Reusable lesson:** when an LLM is allowed to generate a structured query/filter that will
be executed against a database, schema-validate the *shape* (already done here with Zod)
AND allowlist the *field names and operators* before execution — `z.record(string, any())`
validates JSON shape but says nothing about which Mongo operators are safe to run.
Also: a service function that both *builds* a query and *executes* it makes it easy for a
caller to accidentally treat the result as the query — keep "build the filter" and "run the
filter" as separate functions.

### 4. `server/src/controllers/tenderBoardController.ts` + `tenderBoardRouter.ts` (Tamar, Tender Board feature)

**Bug (high, broken access control):** every tender route was gated only by
`authenticateToken` — there was no ownership check at all on update/close/delete. Any
logged-in user could edit, close, or delete *any other user's* tender by ID, not just
their own. Compounding this, `createTenderHandler` set `publisherUserCode` directly from
`req.body`, and the client (`CreateTender.tsx`) populated it from `localStorage` — so a
caller could also fabricate who "published" a tender.

**Fix:**
- `createTenderHandler` now derives `publisherUserCode` from the authenticated user
  (`req.user.userId`), ignoring any value sent in the request body.
- Added an `isOwnerOrAdmin(req, tender)` helper; `updateTenderHandler`,
  `closeTenderHandler`, and `deleteTenderHandler` now fetch the existing tender first and
  return 403 unless the caller is the tender's publisher or an admin.

**Reusable lesson:** `authenticateToken` alone only proves *who* is calling — it says
nothing about whether they're allowed to act on a specific resource. Every mutating route
that operates on a specific record (`:id`) needs its own ownership/role check, matching
the pattern already used correctly in the organizations and (now) contact features. Also:
never trust an "owner"/"publisher" field from the request body on create — derive it
server-side from the authenticated session.

**Test coverage gap (found and closed this session):** `tenderBoardService.test.ts` mocked
`authenticateToken` to a no-op that never set `req.user`, and had no tests at all for
`PUT/PATCH close/DELETE` on a tender — meaning the ownership check added in finding #4
(above) shipped with zero test coverage. Updated the auth mock to accept a `x-test-user`
header (JSON) so tests can simulate different callers, and added 7 new tests: owner can
update/close/delete their own tender, admin can act on anyone's, and a non-owner/non-admin
gets 403 with the underlying service function never called. All 16 tests (9 existing + 7
new) pass.

**Reusable lesson:** when a test suite mocks the auth middleware to a pure no-op, it can't
exercise any authorization logic downstream — worth making the mock configurable (as done
here) rather than bypassing auth entirely, especially once ownership checks exist in the
handlers being tested.

### 8. `client/src/features/tenders/CreateTender.tsx` (Tamar, Tender Board feature)

**Bug (functional, confirms the suspicion from the initial survey):** the smart-create
response handler expected `response.product?.title` etc., but the server's
`createSmartTenderHandler` returns `{ success: true, tender: parsedAiData }` — the key is
`tender`, not `product`. `apiCall()` (`config/api.ts:179`) returns the raw parsed JSON body
with no unwrapping, so `response.product` was always `undefined`. Every field fell back to
`|| current.X` (its previous, empty value) — **the AI "smart create" feature showed a
success message but never actually filled in the form.**

**Fix:** renamed the `SmartCreateResponse.product` field (and all 7 usages) to `.tender`,
matching the server's actual response shape.

**Still present, not changed (low priority):** `clickedAddTender()` still computes
`publisherUserCode` from `localStorage` and sends it in the create-tender request body —
this is now harmless (the server derives `publisherUserCode` from the authenticated user
and ignores the body value, per fix #4 above), but the client code is misleading as
written since it implies the client controls this value. Worth a small follow-up cleanup
to stop sending it at all.

**Reusable lesson:** when the client-side type for an API response is hand-written rather
than shared/generated from the server, a renamed key on either side goes undetected by the
type system (the field is optional, so `undefined` type-checks fine) and fails silently at
runtime. Worth checking each `apiCall<T>()` call site's `T` against the actual controller
response shape after touching either side.

**Also reviewed, no action needed (Tamar, client-side):** `ApplyForTender.tsx`, `Card.tsx`
(both pure presentational, no network calls, no XSS), `ManageMyTenders.tsx` (client-side
filter for the "my tenders" view only — real authorization already enforced server-side),
`ManageTenderDetails.tsx` (correctly types the update/close response as `{ tender }`,
matching the server — unlike the smart-create bug above), `TenderDetails.tsx` (safe
handling of an empty applicants array when computing the proposal range, no XSS).

**Tender Board (Tamar) review: fully complete — all server and client files reviewed.**
Fixes this session: AI query sanitization + double-query bug, ownership checks on
update/close/delete, broken smart-create response mapping, and new server-side test
coverage for the ownership checks.

---

### 5. `server/src/services/organizationService.ts` + `organizationRepository.ts` — `topUpOrganizationWallet` (Esti, Organizations feature)

**Bug (high, financial data race condition):** read-modify-write pattern — read
`walletBalance`, compute `newBalance` in JS, write it back with a plain
`updateOrganization`. Two concurrent top-ups (double-click, or an admin and the org owner
topping up at the same moment) can both read the same starting balance and both write the
same result, silently losing one of the increments with no error and no log trace.

**Fix:** added `incrementWalletBalance(orgId, amount)` to `organizationRepository.ts`,
using MongoDB's atomic `$inc` operator (`findByIdAndUpdate(orgId, { $inc: { walletBalance: amount } })`)
instead of computing the new value in application code. `topUpOrganizationWallet` now
calls this instead of read-then-write.

**Reusable lesson:** any balance/counter field that can be modified concurrently (wallet
balances, usage counters, quotas) must be updated with an atomic DB operator (`$inc`,
`$push`, etc.), never via "read current value → compute in JS → write back" — the gap
between read and write is exactly where concurrent requests silently clobber each other.

---

## Session status (2026-07-06, updated) — ALL THREE DEVELOPERS' FILES FULLY REVIEWED

Esti (Organizations), Tamar (Tender Board), and Malki (Contact + AI News) have each had
every server and client file on `develop` read and reviewed line-by-line this session.
Margalit's forum branch was never merged into `develop` and is out of scope for this
file-by-file pass (see `practicum-review.md` for the branch-mapping survey).

**Total fixes this session: 9**, spanning IDOR/access-control bugs, a race condition, a
dead validation-bypass route, a broken AI-response mapping, and two test-hygiene gaps
(now with new/updated tests, all passing). Two items were deliberately documented but
left unfixed pending a team decision (see items A and B below) — both are non-urgent
(admin-only reach, or a rare concurrent-request race).

## Session status (2026-07-06) — coverage summary

**Branch:** `fix/practicum-review` (created from `develop`; the tech lead's own
in-progress work on `refactor/filter-pipeline-workflows` was stashed untouched before
switching, and is still there — do not lose that stash).

**Coverage:** ~19 of the 89 files changed on `develop` vs `main` were read and reviewed
line-by-line this session (~20-25% by file count, but a higher share of the actual
write/auth risk surface — the review deliberately prioritized request handlers, services,
and repositories over styling/CSS/README files).

**Fixed and verified in code (5 items):**
1. IDOR in `contactMessageController.addReply` (Malki) — added ownership check.
2. Silent request-loss on email failure in `contactController.submitContactForm` (Malki) — made email best-effort.
3. Unsanitized AI-generated Mongo filter + a hidden double-query bug in tender smart search, `tenderBoardAIService.ts`/`tenderBoardService.ts` (Tamar) — added `sanitizeSearchFilter` allowlist, separated "build filter" from "run filter".
4. Missing ownership checks + client-trusted `publisherUserCode` on tender update/close/delete, `tenderBoardController.ts` (Tamar) — added `isOwnerOrAdmin` guard, derive publisher server-side.
5. Wallet top-up race condition, `organizationService.ts`/`organizationRepository.ts` (Esti) — added atomic `incrementWalletBalance` using `$inc`.

**Documented but intentionally NOT fixed yet (2 items — need a team decision, not a quick patch):**
- A. `addUserToOrganization`/`createOrganizationMember` maxUsers TOCTOU race (Esti) — needs either a persisted counter field + atomic conditional update, or Mongo transactions (deployment-dependent); bigger schema change, left for a deliberate follow-up.
- B. Duplicated ownership-check block across 8 handlers in `organizationController.ts` (Esti) — works correctly today, flagged as a refactor-to-shared-middleware candidate, not touched to keep this session's diff limited to live bugs.

**Reviewed and found clean, no action needed:** `contactTypeController.ts`, `contactTypeRoutes.ts`, `ContactMessage.ts` model, `contactRouter.ts`, `RequestDetails.tsx`, `AdminRequestsList.tsx`, `MyRequestsList.tsx` (two minor non-blocking UX notes only), `tenderBoardRepository.ts`.

**Not yet opened/reviewed at all this session** (starting point for the next session):

- Organizations (Esti + grinsh): `organizationRouter.ts`, `requireApprovedOrg` middleware, `getOrganizationForUser`/status-transition logic in `organizationService.ts`, client `features/organizations/**`
- `newsService.ts` + tests (Malki, AI News) — reviewed as "fine" in the initial survey, not re-opened file-by-file this session
- All the unmerged branches listed in `practicum-review.md` (Margalit's forum, `payment-payme`, `articles-and-ui`, etc.) — out of scope for this file-by-file pass, which only covers what's already on `develop`
