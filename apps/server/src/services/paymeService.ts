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
 *
 * Rewritten a second time after confirming PayMe's actual, documented
 * API shape (https://docs.payme.io/docs/payments): the first version of
 * this file guessed at a callback payload shape (StatusCode/TransactionId/
 * Amount/MoreData) that does not match PayMe's real Sale Callback
 * attributes (status_code/notify_type/transaction_id/price/payme_transaction_id).
 */

import crypto from "crypto";
import logger from "../logger";
import { generateSale, MIN_SALE_PRICE_AGOROT } from "./paymeClient";
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
  if (Math.round(amount * 100) < MIN_SALE_PRICE_AGOROT) {
    return { success: false, error: `Amount must be at least ${MIN_SALE_PRICE_AGOROT / 100} ${currency}` };
  }

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
 * Verifies that a Sale Callback actually came from PayMe, before any DB
 * access happens.
 *
 * NOT YET IMPLEMENTED: PayMe's callback payload includes a
 * payme_signature field, but the formula for computing/verifying it
 * (which fields, in what order, with what algorithm and key) is not in
 * PayMe's public API docs. We've asked PayMe support directly; until
 * they confirm it, this fails closed - every callback is rejected - so a
 * missing verification step can never be mistaken for a passing one.
 * Once confirmed, this is the only function that needs to change.
 */
export function verifyWebhookSignature(body: { payme_signature?: string }): boolean {
  if (!body.payme_signature) {
    return false;
  }

  logger.warn(
    "PayMe webhook signature verification is not yet implemented (formula not confirmed with PayMe support) - rejecting by default",
  );
  return false;
}

export interface WebhookProcessResult {
  handled: boolean;
  reason?: string;
}

export interface PaymeSaleCallbackBody {
  status_code?: string | number;
  notify_type?: string;
  transaction_id?: string;
  payme_transaction_id?: string;
  price?: string | number;
  currency?: string;
  payme_signature?: string;
  [key: string]: unknown;
}

/**
 * Applies a verified Sale Callback to the matching pending
 * WalletTransaction. Caller is responsible for signature verification
 * before calling this - this function assumes the request is authentic.
 *
 * transaction_id here is PayMe's echo of our own WalletTransaction.requestId
 * (sent as transaction_id in the generate-sale request) - PayMe's own
 * correlator field, not something we had to invent an encoding for.
 */
export async function processWalletTopUpWebhook(body: PaymeSaleCallbackBody): Promise<WebhookProcessResult> {
  const requestId = body.transaction_id;

  if (!requestId) {
    logger.warn("PayMe webhook missing transaction_id", { body });
    return { handled: false, reason: "Missing transaction_id" };
  }

  const transaction = await walletTransactionRepo.findByRequestId(requestId);
  if (!transaction) {
    logger.warn("PayMe webhook for unknown transaction_id", { requestId });
    return { handled: false, reason: "Unknown transaction_id" };
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

  // price is in agorot (e.g. 5075 = 50.75 ILS) - WalletTransaction.amount is ILS.
  const approvedAmount = Number(body.price) / 100;
  if (!Number.isFinite(approvedAmount) || approvedAmount !== transaction.amount) {
    await walletTransactionRepo.markFailedIfPending(requestId, body);
    logger.warn("PayMe webhook amount mismatch - rejecting", {
      requestId,
      expected: transaction.amount,
      received: body.price,
    });
    return { handled: false, reason: "Amount mismatch" };
  }

  const paymeSuccess = body.notify_type === "sale-complete" && String(body.status_code) === "0";
  const payMeTransactionId = body.payme_transaction_id || "";

  if (!paymeSuccess) {
    await walletTransactionRepo.markFailedIfPending(requestId, body);
    return { handled: true, reason: `PayMe notify_type: ${body.notify_type}` };
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
