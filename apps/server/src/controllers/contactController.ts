import { Request, Response } from "express";
import { sendContactEmail } from "../utils/email";
import logger from "../logger";
import { saveMessage } from "../services/contactMessageService";

const MAX_ATTACHMENTS = 5;

/**
 * Handle contact form submission
 */
export async function submitContactForm(req: Request, res: Response) {
  try {
    const { title, description, requestType, attachments } = req.body;
    const user = (req as any).user; // User from JWT token
    const userId = user?.userId || user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "משתמש לא מזוהה. התחבר שוב בבקשה.",
      });
    }

    // Validate input
    if (!title || !description || !requestType) {
      return res.status(400).json({
        success: false,
        message: "נא למלא את כל השדות",
      });
    }

    if (!title.trim() || !description.trim() || !requestType.trim()) {
      return res.status(400).json({
        success: false,
        message: "נא למלא את כל השדות",
      });
    }
    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        message: "נושא ההודעה לא יכול להיות ארוך מ-100 תווים",
      });
    }
    if (description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "תוכן ההודעה לא יכול להיות ארוך מ-1000 תווים",
      });
    }

    let validatedAttachments: { url: string; type: "image" | "video" }[] = [];
    if (attachments !== undefined) {
      if (!Array.isArray(attachments) || attachments.length > MAX_ATTACHMENTS) {
        return res.status(400).json({
          success: false,
          message: `ניתן לצרף עד ${MAX_ATTACHMENTS} קבצים`,
        });
      }
      const isValidAttachment = (a: unknown): a is { url: string; type: "image" | "video" } =>
        !!a &&
        typeof a === "object" &&
        typeof (a as any).url === "string" &&
        !!(a as any).url &&
        ((a as any).type === "image" || (a as any).type === "video");

      if (!attachments.every(isValidAttachment)) {
        return res.status(400).json({
          success: false,
          message: "צירוף לא תקין",
        });
      }
      validatedAttachments = attachments;
    }

    await saveMessage(
      {
        title: title.trim(),
        description: description.trim(),
        requestType: requestType.trim(),
        ...(validatedAttachments.length ? { attachments: validatedAttachments } : {}),
      },
      userId,
    );

    // Send contact email (best-effort: the request is already saved, so a mail failure shouldn't fail the request)
    const payload: any = {
      userEmail: user.email,
      userName: user.name || user.email,
      title: title.trim(),
      description: description.trim(),
      requestType: requestType.trim(),
    };

    try {
      await sendContactEmail(payload);
    } catch (emailError) {
      logger.error("Failed to send contact notification email:", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        userId,
      });
    }

    logger.info("Contact form submitted", {
      userId,
      userEmail: user.email,
      title: title.trim(),
      requestType: requestType.trim(),
    });

    res.json({
      success: true,
      message: "ההודעה נשלחה בהצלחה!",
    });
  } catch (error) {
    logger.error("Failed to submit contact form:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      message: "אירעה שגיאה בשליחת ההודעה. נסה שוב.",
    });
  }
}
