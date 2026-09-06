import { WalletTransaction } from "../models/walletTransaction";
import logger from "../logger";

export async function createPendingTransaction(data: {
  organizationId: string;
  requestId: string;
  amount: number;
  currency?: string;
}) {
  try {
    const transaction = await WalletTransaction.create({
      organizationId: data.organizationId,
      requestId: data.requestId,
      amount: data.amount,
      ...(data.currency ? { currency: data.currency } : {}),
      status: "pending",
    });
    logger.info("Wallet transaction created (pending)", {
      organizationId: data.organizationId,
      requestId: data.requestId,
    });
    return transaction;
  } catch (error: any) {
    logger.error("Failed to create pending wallet transaction", {
      error: error.message,
      stack: error.stack,
      data,
    });
    throw error;
  }
}

export async function findByRequestId(requestId: string) {
  return WalletTransaction.findOne({ requestId }).lean();
}

export async function findByRequestIdAndOrganization(requestId: string, organizationId: string) {
  return WalletTransaction.findOne({ requestId, organizationId }).lean();
}

/**
 * Atomically marks a pending transaction as completed, only if it hasn't
 * already been resolved (completed or failed) by an earlier webhook
 * delivery. Returns null if the transaction was already resolved - the
 * caller must treat that as "already handled, do not credit the wallet
 * again" rather than as an error.
 */
export async function markCompletedIfPending(
  requestId: string,
  payMeTransactionId: string | undefined,
  rawWebhookPayload: unknown,
) {
  try {
    const transaction = await WalletTransaction.findOneAndUpdate(
      { requestId, status: "pending" },
      {
        $set: {
          status: "completed",
          // Omitted entirely (rather than set to "" or null) when PayMe
          // didn't send one, so the unique+sparse index on this field -
          // which only exempts missing/null values, not empty strings -
          // doesn't collide across two callbacks that both lack it.
          ...(payMeTransactionId ? { payMeTransactionId } : {}),
          rawWebhookPayload,
          completedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    if (!transaction) {
      logger.warn("Wallet transaction webhook ignored - already resolved or unknown requestId", {
        requestId,
        payMeTransactionId,
      });
    }

    return transaction;
  } catch (error: any) {
    logger.error("Failed to mark wallet transaction as completed", {
      error: error.message,
      stack: error.stack,
      requestId,
      payMeTransactionId,
    });
    throw error;
  }
}

/**
 * Same not-already-resolved guard as markCompletedIfPending, for the
 * failure path (declined payment, cancelled by user, etc).
 */
export async function markFailedIfPending(requestId: string, rawWebhookPayload: unknown) {
  try {
    const transaction = await WalletTransaction.findOneAndUpdate(
      { requestId, status: "pending" },
      {
        $set: {
          status: "failed",
          rawWebhookPayload,
          completedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    return transaction;
  } catch (error: any) {
    logger.error("Failed to mark wallet transaction as failed", {
      error: error.message,
      stack: error.stack,
      requestId,
    });
    throw error;
  }
}
