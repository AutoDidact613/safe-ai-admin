/**
 * server/src/services/paymeClient.ts
 *
 * Thin HTTP client for PayMe's "generate sale" API. No shared outbound
 * HTTP client exists elsewhere in this codebase to reuse, so this is a
 * small dedicated wrapper rather than a general-purpose one.
 */

import logger from "../logger";

const PAYME_BASE_URL =
  process.env.PAYME_ENV === "production"
    ? "https://icom.yaad.net/p/"
    : "https://sandbox.paymeservice.com/api/generate-sale";

const SELLER_ID = process.env.PAYME_SELLER_ID || "";
const API_KEY = process.env.PAYME_API_KEY || "";
// Client origin only - the org-specific success/fail page path is appended
// per-request below, since it needs organizationId + our own requestId to
// look up the transaction status (see PaymeResultPage.tsx on the client).
const CLIENT_ORIGIN = process.env.PAYME_SUCCESS_URL || "http://localhost:5173";
const CLIENT_FAIL_ORIGIN = process.env.PAYME_FAIL_URL || "http://localhost:5173";
const NOTIFY_URL = process.env.PAYME_NOTIFY_URL || "http://localhost:3001/organizations/payme/webhook";

export interface GenerateSaleResult {
  success: boolean;
  iframeUrl?: string;
  error?: string;
}

/**
 * Builds the PayMe "generate sale" iframe URL for a wallet top-up.
 * requestId is our own correlation id (WalletTransaction.requestId),
 * passed through PayMe as MoreData so the webhook can be matched back
 * to the pending transaction that triggered it.
 */
export async function generateSale(params: {
  requestId: string;
  organizationId: string;
  amount: number;
  currency: string;
}): Promise<GenerateSaleResult> {
  try {
    const resultQuery = `requestId=${encodeURIComponent(params.requestId)}`;
    const goodUrl = `${CLIENT_ORIGIN}/organizations/${params.organizationId}/wallet/payme/success?${resultQuery}`;
    const errorUrl = `${CLIENT_FAIL_ORIGIN}/organizations/${params.organizationId}/wallet/payme/fail?${resultQuery}`;

    const query: Record<string, string> = {
      action: "pay",
      What: "Wallet top-up",
      Amount: String(params.amount),
      Currency: params.currency,
      MoreData: JSON.stringify({
        requestId: params.requestId,
        organizationId: params.organizationId,
      }),
      GoodURL: goodUrl,
      ErrorURL: errorUrl,
      NotifyURL: NOTIFY_URL,
      sellerid: SELLER_ID,
      apikey: API_KEY,
    };

    const iframeUrl = `${PAYME_BASE_URL}?${new URLSearchParams(query).toString()}`;

    logger.info("PayMe generate-sale requested", {
      requestId: params.requestId,
      organizationId: params.organizationId,
      amount: params.amount,
    });

    return { success: true, iframeUrl };
  } catch (error: any) {
    logger.error("PayMe generate-sale failed", {
      error: error.message,
      stack: error.stack,
      requestId: params.requestId,
    });
    return { success: false, error: error.message };
  }
}
