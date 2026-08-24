import { Request, Response } from "express";
import { runInquiryAgentList } from "../services/inquiryAgentService";
import logger from "../logger";

export async function triggerListHandler(_req: Request, res: Response) {
  try {
    const result = await runInquiryAgentList();
    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Failed to run inquiry-agent list", error);

    if (error?.name === "TimeoutError") {
      res.status(504).json({ message: "הפעלת סוכן ה-AI ארכה יותר מדי זמן" });
      return;
    }

    res.status(error?.status || 502).json({
      message: error?.message || "שגיאה בהפעלת סוכן ה-AI",
    });
  }
}
