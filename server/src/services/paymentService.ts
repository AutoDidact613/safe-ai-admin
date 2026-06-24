import logger from "../logger";


//טיפוסים
export type PlanType = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";

export interface PaymentInitResult {
  succeess: boolean;
  iframeUrl?: string;
  error?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  plan?: PlanType;
  billingCycle?: BillingCycle;
  error?: string;
}

//קבועים
const PAYME_BASE_URL = process.env.PAYME_ENV === "production"
    ? "https://icom.yaad.net/p/"
    : "https://sandbox.paymeservice.com/api/generate-sale";

const SELLER_ID = process.env.PAYME_SELLER_ID || "";
const API_KEY = process.env.PAYME_API_KEY || "";
const SUCCESS_URL = process.env.PAYME_SUCCESS_URL || "http://localhost:5173/payment/success";
const FAIL_URL    = process.env.PAYME_FAIL_URL    || "http://localhost:5173/payment/fail";
const NOTIFY_URL  = process.env.PAYME_NOTIFY_URL  || "http://localhost:3001/payment/webhook";

export const PLANS = {
    monthly: {
        label: "PRO חודשי",
        amount: 30 * 100,
        currency: "ILS",
        recurring: true,
    },
    yearly: {
        label: "PRO שנתי",
        amount: 300 * 100,
        currency: "ILS",
        recurring: true,
    },
} as const;

//יצירת עיסקה ב- PayMe
export async function initPayment(
    userId: string,
    userEmail: string,
    billingCycle: BillingCycle
): Promise<PaymentInitResult> {
    try {
        const planConfig = PLANS[billingCycle];

        const params: Record<string, string> = {
            action: "pay",
            What: planConfig.label,
            Amount: String(planConfig.amount),
            Currency: planConfig.currency,
            Tash: "1",
            MoreData: JSON.stringify({ userId, plan: "pro", billingCycle }),
            GoodURL: SUCCESS_URL,
            ErrorURL: FAIL_URL,
            NotifyURL: NOTIFY_URL,
            clientId: userId,
            email: userEmail,
            sellerid: SELLER_ID,
            apikey: API_KEY,
            RecurringType: "1",
            MaxPayments: billingCycle === "monthly" ? "120" : "10",
        };

        const query = new URLSearchParams(params).toString();
        const iframeUrl = `${PAYME_BASE_URL}?${query}`;

        logger.info(`Payment initiated: userId=${userId}, billingCycle=${billingCycle}`);
        return { succeess: true, iframeUrl};
    }
    catch (err: any) {
        logger.error("PayMe initPayment error:", err);
        return { succeess: false, error: err.massage };
    }
}

//עיבוד Wechook מ- PayMe
export async function handleWebhook(
    body: Record<string, string>
): Promise<PaymentVerifyResult> {
    try {
        const { StatusCode, MoreData } = body;

        if (StatusCode !== "'0") {
            logger.warn("PayMe webhook - failed:", body);
            return { success: false, error: `PayMe status: ${StatusCode}` };
        }

        const { userId, plan, billingCycle } = JSON.parse(MoreData || "{}");

        if (!userId || !plan || !billingCycle ) {
            return { success: false, error: "Missing data in webhook"};
        }

        logger.info(`webhook success: userId=${userId}, plan=${plan}, cycle=${billingCycle}`);
        return { success: true, plan, billingCycle };
    }
    catch (err: any) {
        logger.error("PayMe webhook error:", err);
        return { success: false, error: err.message };
    }
}

//ביטול מנוי
export async function cancleSubscription(
    transactionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch("http://icon.yaad.net/p/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action:        "cancelRecurring",
                sellerid:      SELLER_ID,
                apikey:        API_KEY,
                transactionId,
            }),
        });

        const data = await response.json() as { StatusCode?: string; StatusText?: string };

        if (data?.StatusCode === "0") {
            return { success: true };
        }

        return { success: false, error: data?.StatusText || "Cancel failed" };
    }
    catch (err: any) {
        logger.error("PayMe cancleSubscription error:", err);
        return { success: false, error: err.message };
    }
}