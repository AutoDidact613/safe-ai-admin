import mongoose from "mongoose";
import { UsageLog } from "../models";
import logger from "../logger";

export interface UsageStatsSummary {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  avgTokensPerRequest: number;
}

const EMPTY_USAGE_STATS: UsageStatsSummary = {
  totalRequests: 0,
  successfulRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  avgResponseTime: 0,
  avgTokensPerRequest: 0,
};

function toObjectIds(userIds: string | string[]) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  return ids.map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Shared aggregation behind per-user usage stats and per-organization usage
 * summaries - previously hand-copied in three places with a subtle bug: one
 * copy matched userId as a raw string against an ObjectId field, which
 * silently returns zero results in an aggregation $match (unlike find()).
 */
export async function aggregateUsageStats(
  userIds: string | string[],
  since?: Date
): Promise<UsageStatsSummary> {
  const match: Record<string, any> = {
    userId: { $in: toObjectIds(userIds) },
    success: true,
  };
  if (since) {
    match.timestamp = { $gte: since };
  }

  const stats = await UsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: 1 },
        totalTokens: { $sum: "$totalTokens" },
        totalCost: { $sum: "$cost" },
        avgResponseTime: { $avg: "$responseTime" },
        avgTokensPerRequest: { $avg: "$totalTokens" },
      },
    },
  ]);

  return stats[0] ? { ...EMPTY_USAGE_STATS, ...stats[0] } : { ...EMPTY_USAGE_STATS };
}

export async function countRequests(userId: string, since: Date) {
  return UsageLog.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    timestamp: { $gte: since },
  });
}

export async function countFailedRequests(userId: string, since: Date) {
  return UsageLog.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    timestamp: { $gte: since },
    success: false,
  });
}

export async function getDailyUsage(userId: string, since: Date) {
  return UsageLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
        success: true,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        requests: { $sum: 1 },
        tokens: { $sum: "$totalTokens" },
        cost: { $sum: "$cost" },
        avgResponseTime: { $avg: "$responseTime" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

export async function getUsageByModel(userId: string, since: Date) {
  return UsageLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
        success: true,
      },
    },
    {
      $group: {
        _id: { model: "$modelName", provider: "$provider" },
        requests: { $sum: 1 },
        tokens: { $sum: "$totalTokens" },
        cost: { $sum: "$cost" },
        avgTokensPerRequest: { $avg: "$totalTokens" },
        isFree: { $first: "$isFree" },
      },
    },
    { $sort: { requests: -1 } },
  ]);
}

export async function getCostBreakdownByProvider(userId: string, since: Date) {
  return UsageLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: since },
        success: true,
      },
    },
    {
      $group: {
        _id: { provider: "$provider", isFree: "$isFree" },
        totalCost: { $sum: "$cost" },
        requests: { $sum: 1 },
        tokens: { $sum: "$totalTokens" },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);
}

export async function createUsageLog(logData: any) {
  try {
    return await UsageLog.create(logData);
  } catch (error: any) {
    logger.error("Failed to create usage log in DB", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
