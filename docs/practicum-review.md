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
