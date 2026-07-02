import { Resend } from "resend";
import logger from "../logger";

const resend = new Resend(process.env.RESEND_API_KEY);

// כתובת המייל השולחת - יש להגדיר בסביבת ה-.env
const FROM_EMAIL = process.env.MAIL_FROM || "noreply@yourdomain.com";

/**
 * שליחת מייל לבעל המכרז בעת רישום מועמד חדש
 */
export async function sendApplicantRegisteredEmail(params: {
  adminEmail: string;
  tenderTitle: string;
  tenderId: string;
  applicant: {
    name: string;
    email: string;
    details: string;
    proposal?: string | undefined;
    contactMethod?: string | undefined;
  };
}): Promise<void> {
  try {
    const { adminEmail, tenderTitle, tenderId, applicant } = params;
    console.log("Sending applicant registration email...", params);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `נרשם משתתף חדש למכרז: ${tenderTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            משתתף חדש נרשם למכרז
          </h2>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>שם המכרז:</strong> ${tenderTitle}</p>
            <p style="margin: 8px 0 0;"><strong>מזהה מכרז:</strong> ${tenderId}</p>
          </div>

          <h3 style="color: #34495e;">פרטי המועמד</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; font-weight: bold; width: 35%;">שם:</td>
              <td style="padding: 10px;">${applicant.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">אימייל:</td>
              <td style="padding: 10px;">${applicant.email}</td>
            </tr>
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; font-weight: bold;">פרטים:</td>
              <td style="padding: 10px;">${applicant.details}</td>
            </tr>
            ${applicant.proposal ? `
            <tr>
              <td style="padding: 10px; font-weight: bold;">הצעה:</td>
              <td style="padding: 10px;">${applicant.proposal}</td>
            </tr>` : ""}
            ${applicant.contactMethod ? `
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; font-weight: bold;">אמצעי קשר:</td>
              <td style="padding: 10px;">${applicant.contactMethod}</td>
            </tr>` : ""}
          </table>

          <p style="color: #7f8c8d; font-size: 12px; margin-top: 24px;">
            נשלח אוטומטית ב־${new Date().toLocaleString("he-IL")}
          </p>
        </div>
      `,
    });

    logger.info("Applicant registration email sent successfully", {
      adminEmail,
      tenderId,
      applicantEmail: applicant.email,
    });
  } catch (error) {
    // שגיאת מייל לא עוצרת את הרישום - רק מתועדת בלוג
    logger.error("Failed to send applicant registration email", {
      error,
      adminEmail: params.adminEmail,
      tenderId: params.tenderId,
    });
  }
}

/**
 * שליחת מייל לבעל המכרז בעת סגירת מכרז
 */
export async function sendTenderClosedEmail(params: {
  adminEmail: string;
  tenderTitle: string;
  tenderId: string;
  totalApplicants: number;
}): Promise<void> {
  try {
    const { adminEmail, tenderTitle, tenderId, totalApplicants } = params;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `מכרז נסגר: ${tenderTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
            המכרז נסגר
          </h2>

          <div style="background: #fdf2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border-right: 4px solid #e74c3c;">
            <p style="margin: 0; font-size: 16px;">המכרז <strong>${tenderTitle}</strong> נסגר.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; font-weight: bold; width: 35%;">שם המכרז:</td>
              <td style="padding: 10px;">${tenderTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">מזהה מכרז:</td>
              <td style="padding: 10px;">${tenderId}</td>
            </tr>
            <tr style="background: #ecf0f1;">
              <td style="padding: 10px; font-weight: bold;">סה"כ מועמדים שנרשמו:</td>
              <td style="padding: 10px;">${totalApplicants}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">תאריך סגירה:</td>
              <td style="padding: 10px;">${new Date().toLocaleString("he-IL")}</td>
            </tr>
          </table>

          <p style="color: #7f8c8d; font-size: 12px; margin-top: 24px;">
            נשלח אוטומטית ב־${new Date().toLocaleString("he-IL")}
          </p>
        </div>
      `,
    });

    logger.info("Tender closed email sent successfully", { adminEmail, tenderId });
  } catch (error) {
    // שגיאת מייל לא עוצרת את סגירת המכרז - רק מתועדת בלוג
    logger.error("Failed to send tender closed email", {
      error,
      adminEmail: params.adminEmail,
      tenderId: params.tenderId,
    });
  }
}