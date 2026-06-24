import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { initPayment, handleWebhook, cancelSubscription, PLANS } from "../services/paymentService";
import { User } from "../models/user";
import logger from "../logger";

const paymentRouter = Router();

// GET /payment/plans
paymentRouter.get("/plans", (_req: Request, res: Response) => {
  res.json({
    plans: [
      {
        id: "monthly",
        label: PLANS.monthly.label,
        amount: PLANS.monthly.amount / 100,
        currency: "ILS",
        recurring: true,
        description: "גישה מלאה — 30 ₪ לחודש, חיוב אוטומטי",
      },
      {
        id: "yearly",
        label: PLANS.yearly.label,
        amount: PLANS.yearly.amount / 100,
        currency: "ILS",
        recurring: true,
        description: "גישה מלאה — 300 ₪ לשנה (25 ₪ לחודש)",
      },
    ],
  });
});

// POST /payment/initiate
paymentRouter.post("/initiate", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { billingCycle } = req.body;
    const user = (req as any).user;

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ error: "billingCycle חייב להיות 'monthly' או 'yearly'" });
    }

    const result = await initPayment(user.id, user.email, billingCycle);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json({ iframeUrl: result.iframeUrl });
  } catch (err: any) {
    logger.error("Payment initiate error:", err);
    return res.status(500).json({ error: "שגיאה ביצירת עסקה" });
  }
});

// POST /payment/webhook
paymentRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    const result = await handleWebhook(req.body);

    if (!result.success || !result.plan) {
      return res.status(400).json({ error: result.error });
    }

    const { userId } = JSON.parse(req.body.MoreData || "{}");
    const transactionId = req.body.TransactionId || "";

    const nextRenewal = new Date();
    if (result.billingCycle === "monthly") {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    } else {
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        "subscription.plan": "pro",
        "subscription.billingCycle": result.billingCycle,
        "subscription.status": "active",
        "subscription.startDate": new Date(),
        "subscription.renewalDate": nextRenewal,
        "subscription.transactionId": transactionId,
      },
    });

    logger.info(`User ${userId} upgraded to PRO (${result.billingCycle})`);
    return res.json({ success: true });
  } catch (err: any) {
    logger.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

// GET /payment/status
paymentRouter.get("/status", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dbUser = await User.findById(user.id).select("subscription");

    if (!dbUser) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }

    return res.json({ subscription: (dbUser as any).subscription || null });
  } catch (err: any) {
    logger.error("Payment status error:", err);
    return res.status(500).json({ error: "שגיאה בשליפת סטטוס" });
  }
});

// POST /payment/cancel
paymentRouter.post("/cancel", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dbUser = await User.findById(user.id).select("subscription");

    if (!dbUser) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }

    const transactionId = (dbUser as any).subscription?.transactionId;

    if (!transactionId) {
      return res.status(400).json({ error: "לא נמצא מנוי פעיל לביטול" });
    }

    const result = await cancelSubscription(transactionId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    await User.findByIdAndUpdate(user.id, {
      $set: {
        "subscription.status": "cancelled",
        "subscription.cancelledAt": new Date(),
      },
    });

    return res.json({ success: true, message: "המנוי בוטל בהצלחה" });
  } catch (err: any) {
    logger.error("Cancel subscription error:", err);
    return res.status(500).json({ error: "שגיאה בביטול המנוי" });
  }
});

export default paymentRouter;