import { EvaluationLog, EvaluationLogDoc } from "../models/evaluationLog";

export async function createEvaluationLog(data: Partial<EvaluationLogDoc>) {
  return EvaluationLog.create(data);
}

export async function getEvaluationLogsByProfile(profileId: string, limit = 50) {
  return EvaluationLog.find({ profileId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getRecentEvaluationLogs(limit = 100) {
  return EvaluationLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function markEvaluationAsReviewed(logId: string) {
  return EvaluationLog.findByIdAndUpdate(
    logId,
    { isManuallyReviewed: true },
    { new: true }
  ).lean();
}