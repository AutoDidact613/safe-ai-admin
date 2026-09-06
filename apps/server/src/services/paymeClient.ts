/**
 * server/src/services/paymeClient.ts
 *
 * Thin HTTP client for PayMe's real "generate-sale" API
 * (https://docs.payme.io/docs/payments), rewritten after confirming the
 * actual API shape against PayMe's official documentation. The first
 * version of this file (and the old feature/payment-payme branch before
 * it) targeted a different, incorrect API shape entirely - a GET with
 * query params to sandbox.paymeservice.com/icom.yaad.net - which does not
 * match PayMe's documented generate-sale/get-transactions endpoints
 * (POST JSON to sandbox.payme.io/live.payme.io) at all. No shared
 * outbound HTTP client exists elsewhere in this codebase to reuse, so
 * this is a small dedicated wrapper rather than a general-purpose one.
 */

import logger from "../logger";

const PAYME_BASE_URL =
  process.env.PAYME_ENV === "production"
    ? "https://live.payme.io/api"
    : "https://sandbox.payme.io/api";

// The seller's private key in PayMe's system ("MPL..."). This is not a
// separate secret alongside an API key - PayMe's API has no separate API
// key concept. Sent as seller_payme_id in every request body.
const SELLER_PAYME_ID = process.env.PAYME_SELLER_ID || "";

// Client origin for the single post-payment redirect (sale_return_url).
// PayMe's generate-sale API has only one redirect URL, not separate
// success/fail URLs - the result page itself (PaymeResultPage.tsx) looks
// up the real transaction status rather than trusting the redirect.
const CLIENT_ORIGIN = process.env.PAYME_SUCCESS_URL || "http://localhost:5173";

// sale_callback_url - PayMe POSTs sale details here (x-www-form-urlencoded)
// once the sale is paid. Per PayMe's docs this may not be a localhost URL.
const CALLBACK_URL = process.env.PAYME_NOTIFY_URL || "http://localhost:3001/organizations/payme/webhook";

// PayMe's stated minimum sale_price, in agorot (5.00 ILS).
export const MIN_SALE_PRICE_AGOROT = 500;

export interface GenerateSaleResult {
  success: boolean;
  iframeUrl?: string;
  error?: string;
}

/**
 * Calls PayMe's generate-sale endpoint to create a wallet top-up sale
 * and get back the hosted payment page URL to redirect the buyer to.
 * requestId (our own WalletTransaction.requestId) is sent as PayMe's
 * transaction_id field, PayMe's own correlator field for exactly this
 * purpose - so the webhook can be matched back to the pending
 * transaction without inventing our own encoding scheme.
 */
export async function generateSale(params: {
  requestId: string;
  organizationId: string;
  amount: number;
  currency: string;
}): Promise<GenerateSaleResult> {
  try {
    const salePriceAgorot = Math.round(params.amount * 100);

    const response = await fetch(`${PAYME_BASE_URL}/generate-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller_payme_id: SELLER_PAYME_ID,
        sale_price: salePriceAgorot,
        currency: params.currency,
        product_name: "Wallet top-up",
        transaction_id: params.requestId,
        sale_callback_url: CALLBACK_URL,
        sale_return_url: `${CLIENT_ORIGIN}/organizations/${params.organizationId}/wallet/payme/success?requestId=${encodeURIComponent(params.requestId)}`,
      }),
    });

    const data = (await response.json()) as {
      status_code?: number;
      sale_url?: string;
      status_error_details?: string;
    };

    if (data.status_code !== 0 || !data.sale_url) {
      logger.warn("PayMe generate-sale rejected the request", {
        requestId: params.requestId,
        statusCode: data.status_code,
        error: data.status_error_details,
      });
      return { success: false, error: data.status_error_details || "PayMe rejected the sale request" };
    }

    logger.info("PayMe generate-sale succeeded", {
      requestId: params.requestId,
      organizationId: params.organizationId,
      amount: params.amount,
    });

    return { success: true, iframeUrl: data.sale_url };
  } catch (error: any) {
    logger.error("PayMe generate-sale failed", {
      error: error.message,
      stack: error.stack,
      requestId: params.requestId,
    });
    return { success: false, error: error.message };
  }
}
