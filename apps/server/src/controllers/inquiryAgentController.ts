import { Request, Response } from "express";
import {
  runInquiryAgentApprove,
  runInquiryAgentEdit,
  runInquiryAgentList,
  runInquiryAgentProcess,
} from "../services/inquiryAgentService";
import {
  inquiryAgentApproveSchema,
  inquiryAgentEditSchema,
  inquiryAgentProcessSchema,
  validateRequest,
} from "../utils/validation";
import logger from "../logger";

function handleAgentError(error: any, res: Response, action: string) {
  logger.error(`Failed to run inquiry-agent ${action}`, error);

  if (error?.name === "TimeoutError") {
    res.status(504).json({ message: "הפעלת סוכן ה-AI ארכה יותר מדי זמן" });
    return;
  }

  res.status(error?.status || 502).json({
    message: error?.message || "שגיאה בהפעלת סוכן ה-AI",
  });
}

export async function triggerListHandler(_req: Request, res: Response) {
  try {
    const result = await runInquiryAgentList();
    res.status(200).json(result);
  } catch (error: any) {
    handleAgentError(error, res, "list");
  }
}

export async function triggerProcessHandler(req: Request, res: Response) {
  let data;
  try {
    data = validateRequest(inquiryAgentProcessSchema, req.body);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "בקשה לא תקינה" });
    return;
  }

  try {
    const result = await runInquiryAgentProcess(data.threadId, data.ids);
    res.status(200).json(result);
  } catch (error: any) {
    handleAgentError(error, res, "process");
  }
}

export async function triggerEditHandler(req: Request, res: Response) {
  let data;
  try {
    data = validateRequest(inquiryAgentEditSchema, req.body);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "בקשה לא תקינה" });
    return;
  }

  try {
    const result = await runInquiryAgentEdit(data.threadId, data.inquiryId, data.text);
    res.status(200).json(result);
  } catch (error: any) {
    handleAgentError(error, res, "edit");
  }
}

export async function triggerApproveHandler(req: Request, res: Response) {
  let data;
  try {
    data = validateRequest(inquiryAgentApproveSchema, req.body);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "בקשה לא תקינה" });
    return;
  }

  try {
    const result = await runInquiryAgentApprove(data.threadId, data.ids);
    res.status(200).json(result);
  } catch (error: any) {
    handleAgentError(error, res, "approve");
  }
}
