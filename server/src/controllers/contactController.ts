import { Request, Response } from "express";
import { sendContactEmail } from "../utils/email";
import logger from "../logger";

/**
 * Handle contact form submission
 */
export async function submitContactForm(req: Request, res: Response) {
  try {
    const { title, description } = req.body;
    const user = (req as any).user; // User from JWT token

    // Validate input
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "נא למלא את כל השדות",
      });
    }

    if (!title.trim() || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "נא למלא את כל השדות",
      });
    }

    // Send contact email
    await sendContactEmail({
      userEmail: user.email,
      userName: user.name || user.email,
      title: title.trim(),
      description: description.trim(),
    });

    logger.info("Contact form submitted", {
      userId: user.id,
      userEmail: user.email,
      title: title.trim(),
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
