/**
 * Email utility functions and templates
 */

import nodemailer from "nodemailer";
import logger from "../logger";

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const EMAIL_FROM = process.env.EMAIL_FROM || "SafeAI <noreply@safeai.com>";

// ---------------------------------------------------------------------------
// Error-handling convention used in this file:
// - Emails that block a critical user flow (verification, password reset,
//   contact form) THROW on failure, so the caller can react.
// - Emails that are purely informational/best-effort (welcome, org
//   approval/status notifications) SWALLOW errors after logging, so a mail
//   failure never breaks the underlying business operation.
// ---------------------------------------------------------------------------

// --- Transporter caching ----------------------------------------------------
// Avoids re-creating the SMTP connection (and re-running verify()) on every
// single email send.
let cachedTransporter: nodemailer.Transporter | null = null;

const createTransporter = async (): Promise<nodemailer.Transporter> => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpConfigured =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;

  if (smtpConfigured) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    cachedTransporter = transporter;
    return transporter;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP configuration is required in production.");
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  await transporter.verify();
  cachedTransporter = transporter;
  return transporter;
};

/**
 * Invalidate the cached transporter (e.g. after a connection error),
 * forcing a fresh connection + verify() on the next send.
 */
function invalidateTransporterCache() {
  cachedTransporter = null;
}

// --- Security helpers --------------------------------------------------------

/**
 * Escapes HTML-significant characters to prevent HTML/script injection
 * when interpolating user-supplied strings into email HTML bodies.
 */
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips CR/LF from values that end up in email headers (subject, replyTo)
 * to prevent header injection.
 */
function sanitizeHeaderValue(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

// --- Retry helper -------------------------------------------------------------

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

/**
 * Retries an async operation with exponential backoff. Used to wrap
 * transporter.sendMail calls so transient SMTP failures (timeouts,
 * temporary rate limits) don't fail the whole operation on the first try.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  { retries = 2, baseDelayMs = 500 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Connection-level failures likely mean the cached transporter is
      // stale/broken - drop it so the next attempt reconnects.
      invalidateTransporterCache();

      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(`Email send failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string,
) {
  const verificationUrl = `${FRONTEND_URL}/verify-email/${token}`;
  const safeName = escapeHtml(name || "משתמש יקר");

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: "אמת את כתובת האימייל שלך - SafeAI",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ברוך הבא ל-SafeAI!</h1>
          </div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>תודה שנרשמת ל-SafeAI! כדי להשלים את ההרשמה, אנא אמת את כתובת האימייל שלך.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">אמת אימייל</a>
            </p>
            <p>או העתק את הקישור הבא לדפדפן:</p>
            <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p><strong>⚠️ הקישור תקף ל-24 שעות בלבד.</strong></p>
            <p>אם לא ביקשת להירשם ל-SafeAI, אנא התעלם מאימייל זה.</p>
          </div>
          <div class="footer">
            <p>© 2026 SafeAI. כל הזכויות שמורות.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
שלום ${name || "משתמש יקר"},

תודה שנרשמת ל-SafeAI! כדי להשלים את ההרשמה, אנא אמת את כתובת האימייל שלך.

לחץ על הקישור הבא:
${verificationUrl}

הקישור תקף ל-24 שעות בלבד.

אם לא ביקשת להירשם ל-SafeAI, אנא התעלם מאימייל זה.

© 2026 SafeAI
    `,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    logger.info("Email sent", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      envelope: info.envelope,
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("📧 Verification Email (DEV MODE):");
      logger.info("To:", email);
      logger.info("Verification URL:", verificationUrl);
      logger.debug("---");
    }

    return info;
  } catch (error) {
    logger.error("Failed to send verification email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error("Failed to send verification email");
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string,
) {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
  const safeName = escapeHtml(name || "משתמש יקר");

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: "איפוס סיסמה - SafeAI",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 איפוס סיסמה</h1>
          </div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>קיבלנו בקשה לאיפוס הסיסמה של החשבון שלך ב-SafeAI.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">אפס סיסמה</a>
            </p>
            <p>או העתק את הקישור הבא לדפדפן:</p>
            <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${resetUrl}
            </p>
            <div class="warning">
              <strong>⚠️ חשוב לדעת:</strong>
              <ul>
                <li>הקישור תקף לשעה אחת בלבד</li>
                <li>אם לא ביקשת איפוס סיסמה, התעלם מאימייל זה</li>
                <li>הסיסמה הנוכחית שלך תישאר פעילה עד לאיפוס</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 SafeAI. כל הזכויות שמורות.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
שלום ${name || "משתמש יקר"},

קיבלנו בקשה לאיפוס הסיסמה של החשבון שלך ב-SafeAI.

לחץ על הקישור הבא לאיפוס הסיסמה:
${resetUrl}

הקישור תקף לשעה אחת בלבד.

אם לא ביקשת איפוס סיסמה, אנא התעלם מאימייל זה.
הסיסמה הנוכחית שלך תישאר פעילה עד לאיפוס.

© 2026 SafeAI
    `,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("📧 Password Reset Email (DEV MODE):");
      logger.info("To:", email);
      logger.info("Reset URL:", resetUrl);
      logger.debug("---");
    }

    return info;
  } catch (error) {
    logger.error("Failed to send password reset email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  proxyApiKey: string,
) {
  const safeName = escapeHtml(name);
  // proxyApiKey is system-generated (not free-text user input), but we
  // still escape defensively before interpolating into HTML.
  const safeApiKey = escapeHtml(proxyApiKey);

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: "ברוך הבא ל-SafeAI! 🎉",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .api-key { background: white; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; border: 2px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 החשבון שלך מוכן!</h1>
          </div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>האימייל שלך אומת בהצלחה! אתה יכול כעת להתחיל להשתמש ב-SafeAI.</p>
            <p><strong>מפתח ה-API שלך:</strong></p>
            <div class="api-key">${safeApiKey}</div>
            <p><strong>⚠️ חשוב מאוד:</strong> שמור מפתח זה במקום בטוח. זו ההזדמנות האחרונה שלך לראות אותו!</p>
            <p>תוכל להשתמש במפתח זה לביצוע קריאות ל-API שלנו.</p>
            <p>בהצלחה! 🚀</p>
          </div>
          <div class="footer">
            <p>© 2026 SafeAI. כל הזכויות שמורות.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });
  } catch (error) {
    logger.error("Failed to send welcome email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - welcome email is not critical
  }
}

/**
 * Send invite email to a user newly added to an organization by an
 * admin/org owner, containing their temporary password and a link to the
 * site. Best-effort: failures are logged and swallowed, never block the
 * underlying user-creation flow (same convention as sendWelcomeEmail).
 */
export async function sendInviteEmail(
  email: string,
  name: string,
  temporaryPassword: string,
): Promise<boolean> {
  const safeName = escapeHtml(name);
  const safeTemporaryPassword = escapeHtml(temporaryPassword);
  const safeEmail = escapeHtml(email);

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: "הוזמנת להצטרף ל-SafeAI 🎉",
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 15px; border-radius: 5px; border: 2px solid #667eea; }
          .credentials p { margin: 5px 0; }
          .password { font-family: monospace; font-weight: bold; }
          .button { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 הוזמנת ל-SafeAI!</h1>
          </div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>נוצר עבורך חשבון ב-SafeAI. הפרטים להתחברות:</p>
            <div class="credentials">
              <p><strong>אימייל:</strong> ${safeEmail}</p>
              <p><strong>סיסמה זמנית:</strong> <span class="password">${safeTemporaryPassword}</span></p>
            </div>
            <p style="text-align: center;">
              <a class="button" href="${FRONTEND_URL}">כניסה למערכת</a>
            </p>
          </div>
          <div class="footer">
            <p>© 2026 SafeAI. כל הזכויות שמורות.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });
    return true;
  } catch (error) {
    logger.error("Failed to send invite email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - invite email failure must not block user creation
    return false;
  }
}

/**
 * Send contact form email to support
 */
export async function sendContactEmail(data: {
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  requestType: string;
}) {
  const supportEmail = "support@safeai613.com";

  const safeUserName = escapeHtml(data.userName);
  const safeUserEmail = escapeHtml(data.userEmail);
  const safeTitle = escapeHtml(data.title);
  const safeDescription = escapeHtml(data.description);
  const safeRequestType = escapeHtml(data.requestType);

  const mailOptions = {
    from: EMAIL_FROM,
    to: supportEmail,
    // Header values sanitized separately from HTML-escaped values, since
    // these go into email headers rather than the HTML body.
    replyTo: sanitizeHeaderValue(data.userEmail),
    subject: `צור קשר: ${sanitizeHeaderValue(data.title)}`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10a37f 0%, #0d8f6f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-right: 4px solid #10a37f; }
          .label { font-weight: 600; color: #10a37f; margin-bottom: 5px; }
          .value { color: #374151; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 הודעה חדשה מטופס צור קשר</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="label">שם המשתמש:</div>
              <div class="value">${safeUserName}</div>
            </div>
            <div class="info-box">
              <div class="label">אימייל:</div>
              <div class="value">${safeUserEmail}</div>
            </div>
            <div class="info-box">
              <div class="label">כותרת:</div>
              <div class="value">${safeTitle}</div>
            </div>
            <div class="info-box">
              <div class="label">תיאור:</div>
              <div class="value" style="white-space: pre-wrap;">${safeDescription}</div>
            </div>
            <div class="info-box">
              <div class="label">סוג הבקשה:</div>
              <div class="value">${safeRequestType}</div>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 SafeAI. כל הזכויות שמורות.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
הודעה חדשה מטופס צור קשר

שם המשתמש: ${data.userName}
אימייל: ${data.userEmail}
כותרת: ${data.title}

תיאור:
${data.description}

---
© 2026 SafeAI
    `,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    logger.info("Contact email sent", {
      messageId: info.messageId,
      to: supportEmail,
      from: data.userEmail,
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("📧 Contact Email (DEV MODE):");
      logger.info("From:", data.userEmail);
      logger.info("To:", supportEmail);
      logger.info("Title:", data.title);
      logger.debug("---");
    }

    return info;
  } catch (error) {
    logger.error("Failed to send contact email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error("Failed to send contact email");
  }
}

/**
 * Notify a system admin that a new organization is awaiting approval
 */
export async function sendOrgApprovalRequestEmail(
  adminEmail: string,
  orgName: string,
  ownerEmail: string,
) {
  const dashboardUrl = `${FRONTEND_URL}/safeai-ui`;
  const safeOrgName = escapeHtml(orgName);
  const safeOwnerEmail = escapeHtml(ownerEmail);

  const mailOptions = {
    from: EMAIL_FROM,
    to: adminEmail,
    subject: `בקשת ארגון חדשה ממתינה לאישור - ${sanitizeHeaderValue(orgName)}`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-right: 4px solid #667eea; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🏢 בקשת ארגון חדשה</h1></div>
          <div class="content">
            <p>שלום,</p>
            <p>התקבלה בקשה חדשה לפתיחת ארגון הממתינה לאישורך:</p>
            <div class="info-box"><strong>שם הארגון:</strong> ${safeOrgName}</div>
            <div class="info-box"><strong>יוצר הבקשה:</strong> ${safeOwnerEmail}</div>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">מעבר למסך האישורים</a>
            </p>
          </div>
          <div class="footer"><p>© 2026 SafeAI. כל הזכויות שמורות.</p></div>
        </div>
      </body>
      </html>
    `,
    text: `בקשת ארגון חדשה ממתינה לאישור.\nשם הארגון: ${orgName}\nיוצר הבקשה: ${ownerEmail}\nלאישור: ${dashboardUrl}\n\n© 2026 SafeAI`,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("📧 Org Approval Request Email (DEV MODE):");
      logger.info("To:", adminEmail);
      logger.info("Org:", orgName);
    }
    return info;
  } catch (error) {
    logger.error("Failed to send org approval request email:", {
      error: error instanceof Error ? error.message : String(error),
    });
    // best-effort - לא זורקים כדי לא להפיל את יצירת הבקשה
  }
}

/**
 * Notify the org owner that their organization was approved and activated
 */
export async function sendOrgApprovedEmail(
  ownerEmail: string,
  orgName: string,
  name?: string,
) {
  const dashboardUrl = `${FRONTEND_URL}/safeai-ui`;
  const safeOrgName = escapeHtml(orgName);
  const safeName = escapeHtml(name || "מנהל הארגון");

  const mailOptions = {
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `הארגון "${sanitizeHeaderValue(orgName)}" אושר! 🎉`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10a37f 0%, #0d8f6f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #10a37f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎉 הארגון שלך אושר!</h1></div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>הבקשה לפתיחת הארגון <strong>${safeOrgName}</strong> אושרה, והארגון פעיל כעת.</p>
            <p>מעכשיו יש לך גישה מלאה למסך ניהול הארגון.</p>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">מעבר לניהול הארגון</a>
            </p>
          </div>
          <div class="footer"><p>© 2026 SafeAI. כל הזכויות שמורות.</p></div>
        </div>
      </body>
      </html>
    `,
    text: `שלום ${name || "מנהל הארגון"},\nהבקשה לפתיחת הארגון "${orgName}" אושרה והארגון פעיל כעת.\nלניהול הארגון: ${dashboardUrl}\n\n© 2026 SafeAI`,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("📧 Org Approved Email (DEV MODE):");
      logger.info("To:", ownerEmail);
      logger.info("Org:", orgName);
    }
    return info;
  } catch (error) {
    logger.error("Failed to send org approved email:", {
      error: error instanceof Error ? error.message : String(error),
    });
    // best-effort
  }
}

const ORG_STATUS_EMAIL_COPY = {
  rejected: {
    subject: (orgName: string) => `הבקשה לפתיחת הארגון "${orgName}" נדחתה`,
    heading: "הבקשה שלך נדחתה",
    color: "#d9534f",
    message: (orgName: string) =>
      `הבקשה לפתיחת הארגון <strong>${orgName}</strong> נבדקה ולא אושרה על ידי מנהל המערכת.`,
  },
  suspended: {
    subject: (orgName: string) => `הארגון "${orgName}" הושעה`,
    heading: "הארגון שלך הושעה",
    color: "#d9534f",
    message: (orgName: string) =>
      `הארגון <strong>${orgName}</strong> הושעה על ידי מנהל המערכת, וגישת המשתמשים אליו חסומה זמנית.`,
  },
  reactivated: {
    subject: (orgName: string) => `הארגון "${orgName}" הופעל מחדש`,
    heading: "הארגון שלך הופעל מחדש",
    color: "#10a37f",
    message: (orgName: string) =>
      `הארגון <strong>${orgName}</strong> הופעל מחדש וחזר לפעילות מלאה.`,
  },
} as const;

/**
 * Notify the org owner about a rejection, suspension, or reactivation.
 * Shares one template so the three less-common status transitions stay
 * consistent with each other (and with the approval email above) instead
 * of only the "approved" path ever notifying the owner.
 */
export async function sendOrgStatusEmail(
  kind: keyof typeof ORG_STATUS_EMAIL_COPY,
  ownerEmail: string,
  orgName: string,
  name?: string,
) {
  const copy = ORG_STATUS_EMAIL_COPY[kind];
  const dashboardUrl = `${FRONTEND_URL}/safeai-ui`;

  const safeOrgName = escapeHtml(orgName);
  const safeName = escapeHtml(name || "מנהל הארגון");

  const mailOptions = {
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: sanitizeHeaderValue(copy.subject(orgName)),
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${copy.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: ${copy.color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${copy.heading}</h1></div>
          <div class="content">
            <p>שלום ${safeName},</p>
            <p>${copy.message(safeOrgName)}</p>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">מעבר למסך הארגון</a>
            </p>
          </div>
          <div class="footer"><p>© 2026 SafeAI. כל הזכויות שמורות.</p></div>
        </div>
      </body>
      </html>
    `,
    text: `שלום ${name || "מנהל הארגון"},\n${copy.message(orgName).replace(/<[^>]+>/g, "")}\n${dashboardUrl}\n\n© 2026 SafeAI`,
  };

  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug(`📧 Org ${kind} Email (DEV MODE):`);
      logger.info("To:", ownerEmail);
      logger.info("Org:", orgName);
    }
    return info;
  } catch (error) {
    logger.error(`Failed to send org ${kind} email:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    // best-effort
  }
}

/**
 * Notify the tender's publisher that a new applicant registered
 */
export async function sendApplicantRegisteredEmail(params: {
  adminEmail: string;
  tenderTitle: string;
  tenderId: string;
  applicantId?: string | undefined;
  applicant: {
    name: string;
    email: string;
    details: string;
    proposal?: string | undefined;
    contactMethod?: string | undefined;
  };
}): Promise<void> {
  const { adminEmail, tenderTitle, tenderId, applicantId, applicant } = params;

  const safeTenderTitle = escapeHtml(tenderTitle);
  const safeName = escapeHtml(applicant.name);
  const safeEmail = escapeHtml(applicant.email);
  const safeDetails = escapeHtml(applicant.details);
  const safeProposal = applicant.proposal
    ? escapeHtml(applicant.proposal)
    : undefined;
  const safeContactMethod = applicant.contactMethod
    ? escapeHtml(applicant.contactMethod)
    : undefined;

  // קישור לצפייה ישירה בהצעה שהוגשה, במסך "המכרזים שלי" של בעל המכרז.
  const proposalUrl = applicantId
    ? `${FRONTEND_URL}/tender-board?screen=manage&tenderId=${encodeURIComponent(tenderId)}&applicantId=${encodeURIComponent(applicantId)}`
    : `${FRONTEND_URL}/tender-board?screen=manage&tenderId=${encodeURIComponent(tenderId)}`;

  const mailOptions = {
    from: EMAIL_FROM,
    to: adminEmail,
    subject: `נרשם משתתף חדש למכרז: ${sanitizeHeaderValue(tenderTitle)}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
          משתתף חדש נרשם למכרז
        </h2>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>שם המכרז:</strong> ${safeTenderTitle}</p>
          <p style="margin: 8px 0 0;"><strong>מזהה מכרז:</strong> ${escapeHtml(tenderId)}</p>
        </div>

        <h3 style="color: #34495e;">פרטי המועמד</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #ecf0f1;">
            <td style="padding: 10px; font-weight: bold; width: 35%;">שם:</td>
            <td style="padding: 10px;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">אימייל:</td>
            <td style="padding: 10px;">${safeEmail}</td>
          </tr>
          <tr style="background: #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">פרטים:</td>
            <td style="padding: 10px;">${safeDetails}</td>
          </tr>
          ${safeProposal ? `
          <tr>
            <td style="padding: 10px; font-weight: bold;">הצעה:</td>
            <td style="padding: 10px;">${safeProposal}</td>
          </tr>` : ""}
          ${safeContactMethod ? `
          <tr style="background: #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">אמצעי קשר:</td>
            <td style="padding: 10px;">${safeContactMethod}</td>
          </tr>` : ""}
        </table>

        <p style="text-align: center; margin: 24px 0;">
          <a href="${proposalUrl}" style="display: inline-block; padding: 12px 28px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            צפייה בהצעה
          </a>
        </p>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 24px;">
          נשלח אוטומטית ב־${new Date().toLocaleString("he-IL")}
        </p>
      </div>
    `,
    text: `משתתף חדש נרשם למכרז: ${tenderTitle}\n\nשם: ${applicant.name}\nאימייל: ${applicant.email}\nפרטים: ${applicant.details}\n${applicant.proposal ? `הצעה: ${applicant.proposal}\n` : ""}${applicant.contactMethod ? `אמצעי קשר: ${applicant.contactMethod}\n` : ""}\nלצפייה בהצעה: ${proposalUrl}\n\n© 2026 SafeAI`,
  };

  try {
    await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    logger.info("Applicant registration email sent successfully", {
      adminEmail,
      tenderId,
      applicantEmail: applicant.email,
    });
  } catch (error) {
    logger.error("Failed to send applicant registration email", {
      error: error instanceof Error ? error.message : String(error),
      adminEmail,
      tenderId,
    });
    // best-effort - a mail failure shouldn't fail applicant registration
  }
}

/**
 * Notify the tender's publisher that their tender was closed
 */
export async function sendTenderClosedEmail(params: {
  adminEmail: string;
  tenderTitle: string;
  tenderId: string;
  totalApplicants: number;
}): Promise<void> {
  const { adminEmail, tenderTitle, tenderId, totalApplicants } = params;
  const safeTenderTitle = escapeHtml(tenderTitle);
  const closedAt = new Date().toLocaleString("he-IL");

  const mailOptions = {
    from: EMAIL_FROM,
    to: adminEmail,
    subject: `מכרז נסגר: ${sanitizeHeaderValue(tenderTitle)}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
          המכרז נסגר
        </h2>

        <div style="background: #fdf2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border-right: 4px solid #e74c3c;">
          <p style="margin: 0; font-size: 16px;">המכרז <strong>${safeTenderTitle}</strong> נסגר.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr style="background: #ecf0f1;">
            <td style="padding: 10px; font-weight: bold; width: 35%;">שם המכרז:</td>
            <td style="padding: 10px;">${safeTenderTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">מזהה מכרז:</td>
            <td style="padding: 10px;">${escapeHtml(tenderId)}</td>
          </tr>
          <tr style="background: #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">סה"כ מועמדים שנרשמו:</td>
            <td style="padding: 10px;">${totalApplicants}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">תאריך סגירה:</td>
            <td style="padding: 10px;">${closedAt}</td>
          </tr>
        </table>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 24px;">
          נשלח אוטומטית ב־${closedAt}
        </p>
      </div>
    `,
  };

  try {
    await withRetry(async () => {
      const transporter = await createTransporter();
      return transporter.sendMail(mailOptions);
    });

    logger.info("Tender closed email sent successfully", { adminEmail, tenderId });
  } catch (error) {
    logger.error("Failed to send tender closed email", {
      error: error instanceof Error ? error.message : String(error),
      adminEmail,
      tenderId,
    });
    // best-effort - a mail failure shouldn't fail tender closing
  }
}