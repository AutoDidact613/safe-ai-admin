# PayMe Sandbox End-to-End Test — Runbook

Goal: run one real top-up through PayMe's sandbox (not mocks) and capture
the actual Sale Callback payload, to confirm field shapes match the code
in `apps/server/src/services/paymeService.ts` / `paymeClient.ts`.

This cannot be run unattended from a CI/agent session — it needs a real
browser (to enter a PayMe test card on their hosted payment page) and a
public callback URL PayMe can reach, plus a value not currently in the
repo. See "Before you start" below.

## Before you start — what you need

- **A sandbox `seller_payme_id`.** `.env.example`'s `PAYME_SELLER_ID` is
  blank. The only ID confirmed so far (`MPL17875-70374FC7-BJCQOYKU-XW4E6BFV`)
  was seen under "סביבת אמת" (production) in the PayMe portal settings
  page. Check the same settings page for a sandbox/test equivalent before
  running this — without it, `generate-sale` calls to
  `sandbox.payme.io` will fail authentication.
- **A tunnel tool** (ngrok or similar) to expose `localhost:3001` publicly
  — PayMe's docs explicitly reject a `localhost` `sale_callback_url`.
  Not installed in this environment; install locally (e.g. `brew install
  ngrok` / npm global install) and sign in with an ngrok account.
- A running local Mongo instance (or `MONGO_URI` pointed at one) — the
  server won't start without it.

## Steps

1. **Start the tunnel first**, so you have the public URL before
   configuring the server:
   ```
   ngrok http 3001
   ```
   Copy the `https://<random>.ngrok-free.app` URL it prints.

2. **Set server env vars** (`apps/server/.env`):
   ```
   PAYME_ENV=sandbox
   PAYME_SELLER_ID=<sandbox seller_payme_id>
   PAYME_SUCCESS_URL=http://localhost:5173
   PAYME_NOTIFY_URL=https://<your-ngrok-subdomain>.ngrok-free.app/organizations/:id/wallet/payme/webhook
   ```

3. **Start the server** in dev mode:
   ```
   cd apps/server && npm run dev
   ```

4. **Start the client** (separate terminal):
   ```
   cd apps/client && npm run dev
   ```

5. **Trigger a top-up** through the actual UI: log in as an org
   admin/owner, open the wallet top-up flow, enter the minimum amount
   (5.00 ILS / 500 agorot), and submit. This calls
   `POST /:id/wallet/payme/initiate` and redirects to PayMe's hosted
   iframe (`sale_url`).

6. **Pay with a PayMe sandbox test card** (see PayMe's docs "Test Cards
   and Payment Methods" page for current valid numbers — do not use a
   real card).

7. **Watch the server logs** for the incoming webhook POST to
   `/organizations/:id/wallet/payme/webhook`. Because
   `verifyWebhookSignature` fails closed (SCRUM-271), the request will be
   **logged and then rejected with 401** — that's expected right now.
   What matters for this test is capturing the **raw body PayMe actually
   sent**, to confirm against the field list already documented in
   `paymeService.ts` (`status_code`, `notify_type`, `transaction_id`,
   `payme_transaction_id`, `price`, `payme_signature`, ...).

8. **Record findings** in this file (append a dated section below) or in
   a Jira comment on SCRUM-271: confirmed field names, and the exact
   length/format of the `payme_signature` value received (compare
   against the 32-hex-char / MD5-shaped example already noted from the
   docs).

## What this test does *not* unblock

Even a fully successful run here does not let you complete a payment
end-to-end — the webhook will still be rejected until SCRUM-271's
signature formula is confirmed by PayMe support. This test only verifies
the *shape* of PayMe's real traffic against what the code already
assumes.
