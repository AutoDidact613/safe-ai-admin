import { Request, Response } from "express";
import { sendContactEmail } from "../utils/email";
import logger from "../logger";
import { saveMessage } from "../services/contactMessageService";
import * as attachmentService from "../services/attachmentService";

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

    const savedMessage = await saveMessage(
      {
        title: title.trim(),
        description: description.trim(),
        requestType: requestType.trim(),
        ...(validatedAttachments.length ? { attachments: validatedAttachments } : {}),
      },
      userId,
    );

    if (validatedAttachments.length) {
      // Best-effort: these attachments were already uploaded and registered
      // as "pending" earlier (see registerAttachment below). A failure here
      // shouldn't fail the whole request - the daily cleanup job will
      // eventually remove them as expired pending attachments regardless.
      try {
        await attachmentService.linkAttachmentsToMessage(
          validatedAttachments.map((a) => a.url),
          userId,
          savedMessage.id,
        );
      } catch (linkError) {
        logger.error("Failed to link attachments to contact message:", {
          error: linkError instanceof Error ? linkError.message : String(linkError),
          stack: linkError instanceof Error ? linkError.stack : undefined,
          userId,
        });
      }
    }

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

// Fallback cap for attachments stored directly in MongoDB (as a base64 data
// URI) when S3 is unavailable: ~2MB of raw file data, inflated by base64's
// ~33% overhead. Keeps 5 attachments (MAX_ATTACHMENTS) safely under the
// 16MB BSON document limit once linked onto the same ContactMessage.
const MAX_FALLBACK_DATA_URI_LENGTH = 2.8 * 1024 * 1024;

/**
 * Register a screenshot/recording that was just uploaded as "pending" - it
 * isn't yet attached to any submitted contact request. Lets the daily
 * cleanup job find and delete it later if the user never submits the form
 * it was captured for.
 *
 * Accepts either `{ url, type }` (the normal path - already uploaded
 * directly to S3 by the client) or `{ data, type }` (fallback path - a
 * base64 data URI, used when the S3 upload itself failed). Either way the
 * value ends up in the same `url` field: a data URI is just a longer
 * string, and every consumer (RequestDetails.tsx, the cleanup job) already
 * treats `url` as opaque.
 */
export async function registerAttachment(req: Request, res: Response) {
  try {
    const { url, data, type } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "משתמש לא מזוהה. התחבר שוב בבקשה.",
      });
    }

    if (type !== "image" && type !== "video") {
      return res.status(400).json({ success: false, message: "סוג צירוף לא נתמך" });
    }

    let finalUrl: string;
    if (data !== undefined) {
      if (typeof data !== "string" || !data.startsWith(`data:${type}/`)) {
        return res.status(400).json({ success: false, message: "קובץ גיבוי לא תקין" });
      }
      if (data.length > MAX_FALLBACK_DATA_URI_LENGTH) {
        return res.status(400).json({
          success: false,
          message: "הקובץ גדול מדי לגיבוי. יש להגדיר S3 כדי להעלות קבצים גדולים.",
        });
      }
      finalUrl = data;
    } else {
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, message: "כתובת צירוף לא תקינה" });
      }
      finalUrl = url;
    }

    const attachment = await attachmentService.registerPendingAttachment(finalUrl, type, userId);

    res.status(201).json({ success: true, attachment });
  } catch (error) {
    logger.error("Failed to register attachment:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      message: "אירעה שגיאה ברישום הקובץ המצורף. נסה שוב.",
    });
  }
}
