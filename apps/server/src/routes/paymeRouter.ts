import express from "express";
import { authenticateToken } from "../middleware/auth";
import { requireApprovedOrg } from "./organizationRouter";
import {
  initiatePaymeTopUpHandler,
  paymeWebhookHandler,
  paymeStatusHandler,
} from "../controllers/paymeController";

// Called by PayMe itself (PAYME_NOTIFY_URL) - cannot carry our auth token,
// so it's intentionally excluded from authenticateToken. Authenticity is
// verified inside the handler via HMAC signature instead (see
// paymeService.verifyWebhookSignature).
//
// This is a separate router from the one below so it can be mounted on
// "/organizations" *before* organizationRouter: organizationRouter applies
// authenticateToken to every "/organizations/*" path via a pathless
// router.use(), which would otherwise shadow this route and 401 every
// PayMe callback before it ever reaches this handler.
export const paymeWebhookRouter = express.Router();
paymeWebhookRouter.post("/:id/wallet/payme/webhook", paymeWebhookHandler);

// Routes below are called by our own client and require a logged-in Admin
// or the organization's own owner. Mounted on "/organizations" after
// organizationRouter, same as before - no ordering constraint here since
// both require auth.
const router = express.Router();

router.use(authenticateToken);

router.post("/:id/wallet/payme/initiate", requireApprovedOrg, initiatePaymeTopUpHandler);
router.get("/:id/wallet/payme/status/:transactionId", requireApprovedOrg, paymeStatusHandler);

export default router;
