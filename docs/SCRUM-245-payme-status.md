# SCRUM-245 / SCRUM-271 — PayMe Wallet Top-Up: Status (2026-08-30)

## Where things stand

Code is ready and consolidated. Two external blockers prevent going live in production:

1. **`payme_signature` formula is undocumented.** `verifyWebhookSignature` in
   `apps/server/src/services/paymeService.ts` fails closed (rejects every
   webhook) until PayMe support confirms which fields/order/algorithm/key
   are used. Confirmed not documented anywhere public: the "Generate
   Payment" API reference page, the "Sale Callbacks" attributes page, and
   the entire "Guides & Use Cases" section — searched for `signature`,
   `hash`, and `HMAC` with no relevant results. One clue: the example
   `payme_signature` value in the docs (`75e99dbcb25cdfbe1c62f0b9376f4144`)
   is 32 hex chars, consistent with MD5 rather than SHA-256 — not
   confirmed, just an indicator of output length. The portal's own
   settings page (with a real, authenticated account) shows only a
   `seller_payme_id`, no separate "Signing Key" field.
2. **PayMe account verification is in progress.** Business agreement
   signed (step 3/5); PayMe verification underway as of this doc (step
   4/5, quoted turnaround up to 3 business days).

Tracked in Jira as **SCRUM-245** (parent, labeled `blocked`) and
**SCRUM-271** (webhook signature subtask, labeled `blocked`).

## What's done

- Real API integration (`fix/payme-real-api`) rewritten against PayMe's
  actual documented `generate-sale` / Sale Callback contract.
- Consolidated 5 previously-unmerged branches (real API integration,
  authorization tests, seed data, accessibility, performance) into
  `feature/payme-wallet-integration` — clean merge, no conflicts.
- Implemented and shipped the 3 non-blocked SCRUM-245 findings:
  production 404 guard on the mock top-up endpoint, rate limiting on the
  initiate/webhook routes, currency allowlist validation.
- `tsc --noEmit` clean; full server suite passing (120/120 tests, 16/16
  suites).
- **[PR #351](https://github.com/SafeAI613/SafeAI-613/pull/351)** (Draft,
  `feature/payme-wallet-integration` → `develop`) — intentionally left in
  Draft until both blockers above clear.

## What's blocked / next

- Waiting on a reply from PayMe support (question about the
  `payme_signature` formula) and on PayMe's account verification.
- Once the formula is confirmed: implement it in `verifyWebhookSignature`,
  drop the "not implemented yet" `logger.warn`, add a valid/invalid
  signature test, take PR #351 out of Draft.
- Sandbox end-to-end test (real transaction against `sandbox.payme.io`,
  via a local server + tunnel) is prepared but not yet run — see
  `docs/PAYME_SANDBOX_E2E_TEST.md` for the runbook and what's still
  needed to execute it.
