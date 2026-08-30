import express from "express";
import { authenticateToken } from "../middleware/auth";
import { paymeInitiateRateLimiter, paymeWebhookRateLimiter } from "../middleware/authRateLimiter";
import { requireApprovedOrg } from "./organizationRouter";
import {
  initiatePaymeTopUpHandler,
  paymeWebhookHandler,
  paymeStatusHandler,
} from "../controllers/paymeController";

const router = express.Router();

// Called by PayMe itself (PAYME_NOTIFY_URL) - cannot carry our auth token,
// so it's intentionally excluded from authenticateToken. Authenticity is
// verified inside the handler via HMAC signature instead (see
// paymeService.verifyWebhookSignature).
router.post("/:id/wallet/payme/webhook", paymeWebhookRateLimiter, paymeWebhookHandler);

// From here on, routes are called by our own client and require a logged-in
// Admin or the organization's own owner.
router.use(authenticateToken);

router.post("/:id/wallet/payme/initiate", paymeInitiateRateLimiter, requireApprovedOrg, initiatePaymeTopUpHandler);
router.get("/:id/wallet/payme/status/:transactionId", requireApprovedOrg, paymeStatusHandler);

export default router;
