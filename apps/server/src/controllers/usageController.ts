/**
 * server/src/controllers/usageController.ts
 *
 * Controller for usage statistics and cost tracking endpoints.
 */

import { Request, Response } from "express";
import { UsageLog } from "../models";
import { User } from "../models/user";
import logger from "../logger";
import mongoose from "mongoose";

/**
 * Get overall usage statistics for the authenticated user
 */
export async function getUsageStats(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user.userId; // JWT payload has userId, not _id

    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await UsageLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          success: true,
        },
      },
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

    const failedRequests = await UsageLog.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate },
      success: false,
    });

    const result = stats[0] || {
      totalRequests: 0,
      successfulRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      avgTokensPerRequest: 0,
    };

    res.json({
      ...result,
      failedRequests,
      period: `${days} days`,
      startDate,
      endDate: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get usage stats", { error });
    res.status(500).json({ error: "Failed to retrieve usage statistics" });
  }
}

/**
 * Get daily usage breakdown
 */
export async function getDailyUsage(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user.userId; // JWT payload has userId, not _id

    const days = Math.min(parseInt(req.query.days as string) || 7, 60);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await UsageLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          success: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$cost" },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(dailyStats);
  } catch (error) {
    logger.error("Failed to get daily usage", { error });
    res.status(500).json({ error: "Failed to retrieve daily usage" });
  }
}

/**
 * Get usage breakdown by model
 */
export async function getUsageByModel(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user.userId; // JWT payload has userId, not _id

    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const modelStats = await UsageLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          success: true,
        },
      },
      {
        $group: {
          _id: {
            model: "$modelName",
            provider: "$provider",
          },
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$cost" },
          avgTokensPerRequest: { $avg: "$totalTokens" },
          isFree: { $first: "$isFree" },
        },
      },
      {
        $sort: { requests: -1 },
      },
    ]);

    res.json(modelStats);
  } catch (error) {
    logger.error("Failed to get usage by model", { error });
    res.status(500).json({ error: "Failed to retrieve model usage" });
  }
}

/**
 * Get current rate limits and budget status
 */
export async function getLimitsStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user.userId; // JWT payload has userId, not _id

    // Fetch full user from database
    const fullUser = await User.findById(userId);
    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get rate limits
    const rateLimits = fullUser.rateLimits || {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
    };

    // Count recent requests
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [requestsLastMinute, requestsLastDay] = await Promise.all([
      UsageLog.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: oneMinuteAgo },
      }),
      UsageLog.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: oneDayAgo },
      }),
    ]);

    const response: any = {
      rateLimits: {
        perMinute: {
          limit: rateLimits.requestsPerMinute,
          used: requestsLastMinute,
          remaining: Math.max(0, rateLimits.requestsPerMinute - requestsLastMinute),
        },
        perDay: {
          limit: rateLimits.requestsPerDay,
          used: requestsLastDay,
          remaining: Math.max(0, rateLimits.requestsPerDay - requestsLastDay),
        },
      },
    };

    // Add budget info for MANAGED mode
    if (fullUser.mode === "MANAGED") {
      const costLimits = fullUser.costLimits || {
        monthlyBudget: 1,
        currentMonthSpent: 0,
        lastResetDate: new Date(),
      };

      response.budget = {
        monthlyLimit: costLimits.monthlyBudget,
        currentSpent: costLimits.currentMonthSpent,
        remaining: Math.max(0, costLimits.monthlyBudget - costLimits.currentMonthSpent),
        percentUsed: (costLimits.currentMonthSpent / costLimits.monthlyBudget) * 100,
        lastResetDate: costLimits.lastResetDate,
      };
    }

    res.json(response);
  } catch (error) {
    logger.error("Failed to get limits status", { error });
    res.status(500).json({ error: "Failed to retrieve limits status" });
  }
}

/**
 * Get cost breakdown (MANAGED mode only)
 */
export async function getCostBreakdown(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user.userId; // JWT payload has userId, not _id

    // Fetch full user from database
    const fullUser = await User.findById(userId);
    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (fullUser.mode !== "MANAGED") {
      return res.status(403).json({ error: "Cost tracking is only available in MANAGED mode" });
    }

    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costStats = await UsageLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          success: true,
        },
      },
      {
        $group: {
          _id: {
            provider: "$provider",
            isFree: "$isFree",
          },
          totalCost: { $sum: "$cost" },
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
        },
      },
      {
        $sort: { totalCost: -1 },
      },
    ]);

    const totalCost = costStats.reduce((sum, item) => sum + item.totalCost, 0);
    const freeCost = costStats
      .filter((item) => item._id.isFree)
      .reduce((sum, item) => sum + item.totalCost, 0);
    const paidCost = totalCost - freeCost;

    res.json({
      breakdown: costStats,
      summary: {
        totalCost,
        paidCost,
        freeCost,
        period: `${days} days`,
      },
    });
  } catch (error) {
    logger.error("Failed to get cost breakdown", { error });
    res.status(500).json({ error: "Failed to retrieve cost breakdown" });
  }
}

/**
 * Admin: Update user rate limits
 */
export async function updateUserLimits(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const { rateLimits, costLimits } = req.body;

    const updateData: any = {};

    if (rateLimits) {
      if (rateLimits.requestsPerMinute !== undefined) {
        updateData["rateLimits.requestsPerMinute"] = rateLimits.requestsPerMinute;
      }
      if (rateLimits.requestsPerDay !== undefined) {
        updateData["rateLimits.requestsPerDay"] = rateLimits.requestsPerDay;
      }
    }

    if (costLimits) {
      if (costLimits.monthlyBudget !== undefined) {
        updateData["costLimits.monthlyBudget"] = costLimits.monthlyBudget;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    logger.info("User limits updated", { userId, adminId: adminUser._id });

    res.json({
      message: "Limits updated successfully",
      rateLimits: user.rateLimits,
      costLimits: user.costLimits,
    });
  } catch (error) {
    logger.error("Failed to update user limits", { error });
    res.status(500).json({ error: "Failed to update limits" });
  }
}
