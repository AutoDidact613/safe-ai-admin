import { Request, Response } from "express";
import logger from "../logger";
import { getOrganizationById } from "../services/organizationService";
import {
  initiateWalletTopUp,
  verifyWebhookSignature,
  processWalletTopUpWebhook,
  getWalletTopUpStatus,
} from "../services/paymeService";
import { MIN_SALE_PRICE_AGOROT } from "../services/paymeClient";

/**
 * Admin or the organization's own owner may initiate/check a top-up -
 * same ownership rule as topUpOrganizationWalletHandler in
 * organizationController.ts.
 */
async function isAdminOrOwner(req: Request<{ id: string }>, res: Response): Promise<boolean> {
  const user = (req as any).user;
  const organization = await getOrganizationById(req.params.id);
  if (!organization) {
    res.status(404).json({ error: "Organization not found" });
    return false;
  }

  const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;
  if (user.role !== "admin" && ownerId.toString() !== user.userId) {
    res.status(403).json({ error: "Access denied" });
    return false;
  }

  return true;
}

export async function initiatePaymeTopUpHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const orgId = req.params.id;
    const { amount, currency } = req.body;

    if (amount === undefined || typeof amount !== "number" || amount * 100 < MIN_SALE_PRICE_AGOROT) {
      return res
        .status(400)
        .json({ error: `A valid amount of at least ${MIN_SALE_PRICE_AGOROT / 100} is required` });
    }

    if (!(await isAdminOrOwner(req, res))) return;

    const result = await initiateWalletTopUp(orgId, amount, currency);
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json({ iframeUrl: result.iframeUrl, requestId: result.requestId });
  } catch (error: any) {
    logger.error("Failed to initiate PayMe top-up", {
      error: error.message,
      stack: error.stack,
      organizationId: req.params.id,
    });
    return res.status(500).json({ error: "Failed to initiate top-up", details: error.message });
  }
}

export async function paymeWebhookHandler(req: Request, res: Response) {
  try {
    if (!verifyWebhookSignature(req.body)) {
      logger.warn("Rejected PayMe webhook - invalid or missing signature", {
        hasSignature: Boolean(req.body?.payme_signature),
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    const result = await processWalletTopUpWebhook(req.body);
    if (!result.handled) {
      return res.status(400).json({ error: result.reason });
    }

    return res.json({ success: true });
  } catch (error: any) {
    logger.error("PayMe webhook processing failed", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

export async function paymeStatusHandler(req: Request<{ id: string; transactionId: string }>, res: Response) {
  try {
    if (!(await isAdminOrOwner(req, res))) return;

    const transaction = await getWalletTopUpStatus(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res.json({ transaction });
  } catch (error: any) {
    logger.error("Failed to fetch PayMe transaction status", {
      error: error.message,
      stack: error.stack,
      organizationId: req.params.id,
      transactionId: req.params.transactionId,
    });
    return res.status(500).json({ error: "Failed to fetch status", details: error.message });
  }
}
