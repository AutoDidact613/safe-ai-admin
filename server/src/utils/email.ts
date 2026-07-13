/**
 * Email utility functions and templates
 */

import nodemailer from "nodemailer";
import logger from "../logger";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const EMAIL_FROM = process.env.EMAIL_FROM || "SafeAI <noreply@safeai.com>";

// Create transporter (configure based on your email provider)
const createTransporter = () => {
  // For development, use ethereal.email (fake SMTP)
  // For production, configure with your actual SMTP settings
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development mode - log to console instead of sending
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
};

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string,
) {
  const verificationUrl = `${FRONTEND_URL}/verify-email/${token}`;

  const transporter = createTransporter();

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
            <p>שלום ${name || "משתמש יקר"},</p>
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
    const info = await transporter.sendMail(mailOptions);

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

  const transporter = createTransporter();

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
            <p>שלום ${name || "משתמש יקר"},</p>
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
    const info = await transporter.sendMail(mailOptions);

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
  const transporter = createTransporter();

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
            <p>שלום ${name},</p>
            <p>האימייל שלך אומת בהצלחה! אתה יכול כעת להתחיל להשתמש ב-SafeAI.</p>
            <p><strong>מפתח ה-API שלך:</strong></p>
            <div class="api-key">${proxyApiKey}</div>
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
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error("Failed to send welcome email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - welcome email is not critical
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
}) {
  const supportEmail = "support@safeai613.com";
  const transporter = createTransporter();

  const mailOptions = {
    from: EMAIL_FROM,
    to: supportEmail,
    replyTo: data.userEmail,
    subject: `צור קשר: ${data.title}`,
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
              <div class="value">${data.userName}</div>
            </div>
            <div class="info-box">
              <div class="label">אימייל:</div>
              <div class="value">${data.userEmail}</div>
            </div>
            <div class="info-box">
              <div class="label">כותרת:</div>
              <div class="value">${data.title}</div>
            </div>
            <div class="info-box">
              <div class="label">תיאור:</div>
              <div class="value" style="white-space: pre-wrap;">${data.description}</div>
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
    const info = await transporter.sendMail(mailOptions);

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
