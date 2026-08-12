/**
 * server/src/services/usageTracker.ts
 *
 * Service for tracking API usage, costs, and token consumption.
 * Logs each request to the database and updates user's monthly spending.
 */

import { UsageLog } from "../models";
import { User } from "../models/user";
import logger from "../logger";

interface LogUsageParams {
  userId: string;
  profileId?: string;
  provider: string;
  modelName: string;
  mode: "BYOK" | "MANAGED";
  response: any;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  isFree?: boolean;
  cost?: number;
}

/**
 * Extracts usage data from LiteLLM response
 */
function extractUsageData(response: any, fallbackCost: number = 0) {
  const usage = response?.usage || {};
  const hiddenParams = response?._hidden_params || {};

  // Fix: Use fallbackCost if LiteLLM doesn't provide cost or provides 0
  let cost = hiddenParams.response_cost;
  if (!cost || cost === 0) {
    cost = fallbackCost;
    logger.info(`[extractUsageData] Using fallback cost: $${cost.toFixed(6)}`);
  } else {
    logger.info(`[extractUsageData] Using LiteLLM cost: $${cost.toFixed(6)}`);
  }

  return {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    cost: cost,
    requestId: response?.id || undefined,
  };
}

/**
 * Logs API usage to the database
 */
export async function logUsage(params: LogUsageParams): Promise<void> {
  try {
    const {
      userId,
      profileId,
      provider,
      modelName,
      mode,
      response,
      responseTime,
      success,
      errorMessage,
      isFree = false,
      cost = 0,
    } = params;

    // Extract usage data from LiteLLM response
    const usageData = extractUsageData(response, cost);

    // Calculate expiration date (60 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Create usage log
    const logData: any = {
      userId,
      provider,
      modelName,
      mode,
      promptTokens: usageData.promptTokens,
      completionTokens: usageData.completionTokens,
      totalTokens: usageData.totalTokens,
      cost: usageData.cost,
      isFree,
      requestId: usageData.requestId,
      timestamp: new Date(),
      responseTime,
      success,
      errorMessage,
      expiresAt,
    };

    if (profileId) {
      logData.profileId = profileId;
    }

    await UsageLog.create(logData);

    // Update user's monthly spending if not free and in MANAGED mode
    if (!isFree && mode === "MANAGED" && usageData.cost > 0) {
      await User.updateOne(
        { _id: userId },
        { $inc: { "costLimits.currentMonthSpent": usageData.cost } }
      );
    }

    logger.info("Usage logged successfully", {
      userId,
      provider,
      modelName,
      tokens: usageData.totalTokens,
      cost: usageData.cost,
      isFree,
    });
  } catch (error) {
    logger.error("Failed to log usage", { error, userId: params.userId });
    // Don't throw - we don't want to fail the request if logging fails
  }
}

/**
 * Checks if user needs monthly budget reset
 */
export async function checkAndResetMonthlyBudget(userId: string): Promise<void> {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const lastReset = new Date(user.costLimits?.lastResetDate || user.createdAt);
    const now = new Date();

    // Check if a month has passed
    const monthsPassed =
      (now.getFullYear() - lastReset.getFullYear()) * 12 +
      (now.getMonth() - lastReset.getMonth());

    if (monthsPassed >= 1) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            "costLimits.currentMonthSpent": 0,
            "costLimits.lastResetDate": now,
          },
        }
      );

      logger.info("Monthly budget reset", { userId });
    }
  } catch (error) {
    logger.error("Failed to reset monthly budget", { error, userId });
  }
}

/**
 * Gets current usage statistics for a user
 */
export async function getUserUsageStats(userId: string, days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await UsageLog.aggregate([
      {
        $match: {
          userId: userId,
          timestamp: { $gte: startDate },
          success: true,
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$cost" },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    return stats[0] || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
    };
  } catch (error) {
    logger.error("Failed to get usage stats", { error, userId });
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
    };
  }
}
