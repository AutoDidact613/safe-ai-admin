# Practicum Review — `develop` Branch (2026-07-05)

Review of unprotected `develop` branch after two sprint rounds with 4 junior developers
(Tamar, Esti/Ester, Margalit, Malki) + tech lead (grinsh). Read-only review — no fixes
applied yet, per request. Findings should be triaged and assigned back to authors or
fixed directly, as the team decides.

## 1. Who did what

### Esti (Ester Cohen-Kovalsky) — 65 commits, largest contributor
Organizations feature: wallet top-up, statistics dashboard, profile edit, org
creation/signup flow, and a long tail of security fixes (IDOR on remove-user,
admin-only gating on pending orgs, self-approval bug, max-users enforcement, status
transition validation). All her branches are merged into `develop`.

**Not merged:**
- `feature/organization-approval-workflow` — earlier iteration of create-org page/API, superseded.
- `feature/organization-status-fix` — one extra commit ("allow users to create pending organizations") beyond what already landed via PR #101.
- `feature/payment-payme` (with grinsh) — payment routes + success/fail pages, registered in the router but never merged. Real, working-looking feature left on the shelf.

### Tamar (Tamar-BenChaim) — 19 commits
Tender Board feature, including an AI "smart create/search" option (Gemini). Merged via
PR #118. Heavy churn of fix commits stabilizing test imports/TS config suggests the
feature was rough before it landed, but it's in decent shape now (see review below).

**Not merged:** `featur/agents-downloads` — only a "first commit," unclear how far along it is.

### Malki (malky1234) — 28 commits
Contact page (request/reply workflow, admin requests list) and AI News page. Best CI/test
hygiene of the four juniors — she's the only one who added a CI pipeline from scratch and
wrote real unit tests for her own service (`newsService`). Merged via PRs #111/#112.

**Not merged:** `language-toggle` — WIP i18n (Hebrew/English), explicitly unfinished.

### Margalit — 7 commits, **nothing merged anywhere**
Forum feature (posts, JWT auth for posting, comments, tags, file upload) — a full,
untested feature sitting entirely on `remotes/origin/margalit-hazani`, never merged into
`develop` or `main`. This is the largest chunk of orphaned work in the repo (38 files,
+4553/-359 vs `main`). It also edits `organization.ts`/`organizationRepository.ts`/
`organizationService.ts`/`organizationRouter.ts` — the same files Esti and grinsh have
been actively changing — so merging it now will likely conflict. No `test:`, `fix:`, or
CI commits at all on this branch, so beyond the merge conflicts, it hasn't been through
any of the hardening the org feature went through.

**Action needed:** decide with Margalit whether/how to bring this in — it's the one
person whose two weeks of work risk being lost or requiring a large rebase.

### grinsh (tech lead)
Full admin org-management UI/API, org approval flow, and — later — a batch of retrofit
work on the juniors' org feature: test coverage, logging, perf fixes (replacing
full-table scans), email validation, add-users-by-form, Excel export.

**Not merged:** `fix-142-143-wrong-screen` (very recent follow-up, 2026-07-05, may just not
be merged yet), `feature/articles-and-ui` (~22k line diff, real unmerged feature),
`feature/mongoDB` (stale, pre-dates the practicum).

### `main` vs `develop` divergence
`main` has 4 commits not on `develop` — all reverts (`revert-77-feature/org-admin-routing`,
`revert-78-feature/add-users-to-org`). This means **`develop` currently still contains
features that were explicitly reverted on `main`**. Worth confirming with the team why
those were reverted before merging `develop` forward, or those problems will come back.

## 2. Code quality findings

### Organizations (Esti + grinsh)

**High**
- **Wallet top-up race condition** (`organizationService.ts`, `topUpOrganizationWallet`): reads balance, computes new balance in JS, writes back — no atomic `$inc`/transaction. Concurrent top-ups can lose updates. Fix: `Organization.findByIdAndUpdate(orgId, { $inc: { walletBalance: amount } })`.
- **Max-users check has a TOCTOU race** (`addUserToOrganization`, `createOrganizationMember`): count-then-add is not atomic; two concurrent adds can both pass the check and exceed `maxUsers`.

**Medium**
- Authorization is inconsistent in style: some handlers check `role !== "admin"` inline (`createOrganizationHandler`, `deleteOrganizationHandler`), others rely on `requireAdmin` middleware. Functionally fine today, but this exact pattern is how the earlier IDOR/approval bugs happened — standardize on middleware everywhere.
- Redundant DB fetch: `requireApprovedOrg` middleware fetches the org, then the handler fetches it again. Attach it to `req` instead.
- Inconsistent `userId` extraction across handlers (`user.userId || user.id || user._id` in one place, `user.userId` only elsewhere) — fails closed today, but fragile.
- Admin notification on new org requests is best-effort/silent-fail by design — fine, but means a pending request can go unnoticed with no in-app signal.

**What's good:** the previously-reported IDOR on remove-user is now fixed correctly
(resolves the *target* user's org and checks caller is owner/admin); approve/reject/
suspend/activate are all properly gated by `requireAdmin` plus service-layer status-
transition validation; every ownership-sensitive handler re-derives ownership server-side
rather than trusting client input; owners are restricted to editing `name`/`description`
only (can't self-escalate `status`/`walletBalance`/`isActive`); frontend has no
client-only auth logic. No missing-`await` bugs found in this pass.

### Tender Board (Tamar)

- **Good:** AI calls (Gemini) are entirely server-side, API key never reaches the client; smart-create output is validated against a Zod schema so the AI can't smuggle extra fields into a tender.
- **Medium — unsanitized AI output used as a DB query filter**: `smartSearchTenders` lets the AI generate a raw MongoDB filter object (schema only checks "is a non-array object," accepts arbitrary keys/operators) which is passed almost directly into the query layer. A prompt-injection payload in the search text could coerce Mongo operators into the filter. Needs an allowlist of permitted fields/operators before execution.
- **Low:** no role/ownership check on tender routes — any authenticated user can edit/delete any tender, not just its owner (confirm if intended).
- Minor duplication (`saveTenderLog` copy-pasted in two service files) and a possible type/runtime mismatch on `SmartCreateResponse` worth double-checking.
- Tests are real (CRUD, apply, smart-create/search with proper mocking) and run in CI.

### Contact + AI News (Malki)

- **High — IDOR in `addReply`**: unlike the other contact-message handlers, `addReply` has no ownership/admin check — any logged-in user can reply into someone else's request thread by ID, and the response leaks that user's full request history. Needs the same `isAdmin || request.userId === userId` guard used elsewhere in the same controller. **This is a live cross-tenant data leak — recommend fixing first, ahead of the AI query issue above.**
- **Good:** list-all and delete are properly `requireAdmin`-gated; get/close correctly check ownership-or-admin.
- **Low:** contact controller swallows all errors with no logging at all (unlike the tender controller, which logs consistently) — harder to debug in production.
- `newsService` tests are real and well-targeted (validation errors, not-found paths, success path with argument assertions) — best test quality among the juniors' own work.
- No hardcoded secrets or stray `console.log` found.

## 3. Recommended next steps

1. Fix the `addReply` IDOR (contact feature) — highest priority, currently exploitable.
2. Constrain the AI-generated Mongo filter in tender smart-search.
3. Make wallet top-up and max-users-enforcement atomic (race conditions).
4. Decide what to do with Margalit's forum branch before it drifts further from `develop` (org-file conflicts will only get worse).
5. Reconcile the 4 revert commits on `main` with what's still live on `develop`.
6. Sweep up the other unmerged branches (`payment-payme`, `articles-and-ui`, `organization-approval-workflow`/`organization-status-fix`, `agents-downloads`, `language-toggle`) — decide keep/finish/discard for each.

## 4. Ideas for the org Claude.ai account

- Worth uploading this file plus the repo's `AGENTS.md`/CLAUDE.md as project knowledge, so reviews of future PRs start from the same context (who owns which feature area, known trouble spots like the org module's auth pattern).
- A shared "org standards" doc (when to use `requireAdmin` middleware vs. inline checks, how to extract `userId` from `req.user` consistently, atomic-update pattern for balance/counter fields) would prevent the recurring classes of bug above — this could live as a memory/skill for future review sessions.

## 5. Per-student summary (after full file-by-file review — see `practicum-session-log.md` for details)

### Esti (Ester Cohen-Kovalsky) — Organizations feature
**Scope:** by far the largest and most ambitious piece of work in the practicum — a full
multi-tenant org lifecycle (public signup, admin approval/rejection, suspend/reactivate,
wallet top-up, member management, usage stats). 65 commits, all merged.

**Quality:** strong overall design instincts — status-transition validation, best-effort
email side effects, server-side re-derivation of ownership on every sensitive endpoint.
The commit history itself shows real engineering maturity: a steady stream of *targeted,
well-scoped* follow-up security fixes (IDOR, admin-only gating, self-approval, max-users,
status transitions) rather than one big rewrite — that's a good instinct to reinforce.

**What we found/fixed this round:** a wallet-balance race condition (read-modify-write
instead of atomic `$inc`) and a dead route that could have silently bypassed the
status-transition validation she'd already built elsewhere. Both are the kind of subtle
concurrency/defense-in-depth issues that come with experience, not carelessness — the
first-pass logic was correct for the single-request case in both.

**Growth area:** the ownership-check block is copy-pasted across 8 controller handlers
instead of factored into shared middleware. Worth pairing on extracting that pattern next
sprint — it's the exact shape that caused the earlier IDOR bugs, and she already has all
the pieces to fix it herself.

**Unmerged work to follow up on:** `feature/payment-payme` (payment flow, looks real and
functional) and two superseded org-flow branches — worth 10 minutes to confirm nothing
there needs rescuing before deleting the branches.

### Tamar (Tamar-BenChaim) — Tender Board feature
**Scope:** tender board CRUD plus an ambitious AI-assisted "smart create" and "smart
search" (Gemini) — the only feature in the practicum that integrates an LLM into a
write/query path. 19 commits, merged.

**Quality:** the core CRUD and the AI integration's *shape* were solid — API key
server-side only, Zod-schema-validated AI output for creation, tests with proper mocking
of the AI/DB layers. The commit history shows a rough patch stabilizing TypeScript config
and test imports before it landed, which tends to happen with the first feature that
touches a new dependency (AI SDK) in a codebase — not a sign of weaker fundamentals.

**What we found/fixed this round:** this feature had the most findings of the three,
worth discussing directly with her:
1. The AI-generated database filter (smart search) was passed to MongoDB with no
   allowlist — a prompt-injection risk. Good instinct to validate the AI response's
   *shape* with Zod, but the lesson to carry forward is that shape validation isn't the
   same as *semantic* validation (which fields/operators are safe to execute).
2. A function that both *built* a query and *executed* it — the caller then
   double-executed the result, which meant smart search silently ignored the AI's filter
   and always returned every tender. Good lesson on keeping "compute" and "act" as
   separate functions.
3. No ownership check on edit/close/delete of a tender — any logged-in user could modify
   anyone's tender. This one's a straightforward gap to flag directly: ownership checks
   need to exist on every mutating endpoint for a specific record, not just
   `authenticateToken`.
4. The smart-create AI response was mapped to the wrong key client-side
   (`response.product` vs. the server's actual `response.tender`) — the feature *looked*
   like it worked (success message shown) but never actually filled the form. Worth
   showing her this one specifically: it's a good example of why testing a feature
   end-to-end in the browser (not just unit tests with mocks) catches integration bugs
   that mocked tests structurally can't see.

**Growth area:** end-to-end/manual testing of the full request→response round-trip,
especially for anything AI-generated, since mocks can hide a mismatched response shape
indefinitely. Otherwise her instincts for the AI integration (server-side keys, schema
validation, test mocking of the AI layer) were the right ones from day one.

### Malki (malky1234) — Contact Page + AI News
**Scope:** contact/request management (submit, reply, close, admin list) and an AI News
page. 28 commits, merged.

**Quality:** the strongest CI/test hygiene of the three — she's the only junior who added
a CI pipeline from scratch and wrote real, well-targeted unit tests for her own service
(validation errors, not-found paths, success-path argument assertions). That discipline is
worth calling out explicitly as something for the others to emulate.

**What we found/fixed this round:** the one genuinely serious bug in her feature was an
IDOR on the reply endpoint (`addReply`) — every *other* handler in the same controller
(`getRequestById`, `closeRequestById`) correctly checked "is this my request or am I
admin," but the reply handler skipped that check entirely. This is a useful teaching
example precisely because it's a one-line omission in an otherwise-consistent file — a
good habit to build is: when adding a new handler next to siblings that already do an
ownership check, copy that check first, then add the feature logic. Also fixed a
best-effort-email gap in the contact-submission flow (a mail outage was making already-
saved submissions look like they'd failed).

**Test hygiene note:** her own test file for AI News (`newsService.test.ts`) didn't mock
the shared `logger`, so tests were quietly trying to write to a real (unavailable)
MongoDB and hanging ~10s per test — invisible because the tests still passed. Fixed by
mocking `logger`, matching the pattern Tamar used in her own test file. Worth a quick
shared note to both of them: any test exercising code that calls the shared logger should
mock it, the same way DB/email/AI calls already are.

**Unmerged work to follow up on:** `language-toggle` (i18n, explicitly WIP) — worth
checking in on scope/timeline before it goes stale.

### Margalit — Forum feature (not merged)
**Scope:** posts, comments, tags, file upload, and JWT-based auth for creating posts — a
substantial feature (38 files, +4553/-359 vs `main`) built entirely on her own branch.

**Status:** never merged into `develop` or `main`, and not reviewed for code quality in
this pass (out of scope — see `practicum-review.md` §1 for the branch survey). It also
touches the same organization files Esti and grinsh have been iterating on, so the longer
it stays unmerged, the more it will conflict. This is the one piece of practicum work at
real risk of being lost or requiring a costly rebase — worth prioritizing a conversation
with her about integrating it, even if the org-file overlap has to be resolved by hand.
