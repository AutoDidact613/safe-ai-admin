/**
 * server/src/services/paymeService.ts
 *
 * Business logic for organization wallet top-ups via PayMe. Rewritten
 * from scratch for the wallet flow (see SCRUM-257) - not a merge of the
 * old feature/payment-payme branch, which targeted user subscriptions
 * and had the bugs listed in SCRUM-254 (success/succeess mismatch that
 * made /initiate always fail, an inverted StatusCode check that treated
 * successful payments as failed, no webhook signature check, no
 * idempotency, no amount verification). None of that is reused here.
 */

import crypto from "crypto";
import logger from "../logger";
import { generateSale } from "./paymeClient";
import * as walletTransactionRepo from "../repositories/walletTransactionRepository";
import * as organizationRepo from "../repositories/organizationRepository";

export interface InitiateTopUpResult {
  success: boolean;
  iframeUrl?: string;
  requestId?: string;
  error?: string;
}

export async function initiateWalletTopUp(
  organizationId: string,
  amount: number,
  currency = "ILS",
): Promise<InitiateTopUpResult> {
  const requestId = crypto.randomUUID();

  const transaction = await walletTransactionRepo.createPendingTransaction({
    organizationId,
    requestId,
    amount,
    currency,
  });

  const sale = await generateSale({
    requestId,
    organizationId,
    amount,
    currency,
  });

  if (!sale.success || !sale.iframeUrl) {
    await walletTransactionRepo.markFailedIfPending(requestId, {
      reason: "generate-sale failed",
      error: sale.error,
    });
    return { success: false, error: sale.error || "Failed to generate PayMe sale" };
  }

  return { success: true, iframeUrl: sale.iframeUrl, requestId: transaction.requestId };
}

/**
 * Verifies that a webhook request actually came from PayMe, before any
 * DB access happens. Uses HMAC-SHA256 over the raw request body with
 * PAYME_WEBHOOK_SECRET, compared with a timing-safe check.
 *
 * NOTE: PayMe's exact webhook-authentication mechanism must be confirmed
 * against their official documentation before this goes to production -
 * this HMAC scheme is the standard fallback, not a confirmed PayMe
 * contract. If PayMe uses a different mechanism (e.g. a signature header
 * with a different algorithm), this function is the only place that
 * needs to change.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.PAYME_WEBHOOK_SECRET || "";

  if (!secret || !signatureHeader) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export interface WebhookProcessResult {
  handled: boolean;
  reason?: string;
}

/**
 * Applies a verified webhook to the matching pending WalletTransaction.
 * Caller is responsible for signature verification before calling this -
 * this function assumes the request is authentic.
 */
export async function processWalletTopUpWebhook(body: {
  StatusCode?: string;
  TransactionId?: string;
  Amount?: string | number;
  MoreData?: string;
}): Promise<WebhookProcessResult> {
  let requestId: string | undefined;
  try {
    requestId = JSON.parse(body.MoreData || "{}").requestId;
  } catch {
    requestId = undefined;
  }

  if (!requestId) {
    logger.warn("PayMe webhook missing requestId in MoreData", { body });
    return { handled: false, reason: "Missing requestId" };
  }

  const transaction = await walletTransactionRepo.findByRequestId(requestId);
  if (!transaction) {
    logger.warn("PayMe webhook for unknown requestId", { requestId });
    return { handled: false, reason: "Unknown requestId" };
  }

  if (transaction.status !== "pending") {
    // Idempotency: either an earlier delivery of this same webhook already
    // resolved the transaction, or it's a duplicate replay - don't credit
    // the wallet twice either way.
    logger.info("PayMe webhook ignored - transaction already resolved", {
      requestId,
      status: transaction.status,
    });
    return { handled: true, reason: "Already resolved" };
  }

  const approvedAmount = Number(body.Amount);
  if (!Number.isFinite(approvedAmount) || approvedAmount !== transaction.amount) {
    await walletTransactionRepo.markFailedIfPending(requestId, body);
    logger.warn("PayMe webhook amount mismatch - rejecting", {
      requestId,
      expected: transaction.amount,
      received: body.Amount,
    });
    return { handled: false, reason: "Amount mismatch" };
  }

  const paymeSuccess = body.StatusCode === "0";
  const payMeTransactionId = body.TransactionId || "";

  if (!paymeSuccess) {
    await walletTransactionRepo.markFailedIfPending(requestId, body);
    return { handled: true, reason: "PayMe reported failure" };
  }

  const resolved = await walletTransactionRepo.markCompletedIfPending(
    requestId,
    payMeTransactionId,
    body,
  );

  if (!resolved) {
    // Lost the race to another concurrent delivery of the same webhook -
    // it's already completed/failed, so do not credit the wallet again.
    return { handled: true, reason: "Already resolved (race)" };
  }

  await organizationRepo.incrementWalletBalance(transaction.organizationId.toString(), transaction.amount);

  logger.info("PayMe wallet top-up completed", {
    requestId,
    organizationId: transaction.organizationId.toString(),
    amount: transaction.amount,
    payMeTransactionId,
  });

  return { handled: true };
}

export async function getWalletTopUpStatus(requestId: string) {
  return walletTransactionRepo.findByRequestId(requestId);
}
