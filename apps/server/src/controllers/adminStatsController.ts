/**
 * server/src/controllers/adminStatsController.ts
 *
 * Controller for admin-level statistics across all users
 */

import { Request, Response } from "express";
import { UsageLog } from "../models";
import { EvaluationLog } from "../models/evaluationLog";
import { User } from "../models/user";
import logger from "../logger";

/**
 * Get system-wide statistics for admin dashboard
 */
export async function getAdminStats(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total requests (successful and failed)
    const [successfulStats, failedCount, evaluationCount, totalUsers, activeUsers] = await Promise.all([
      // Successful requests stats
      UsageLog.aggregate([
        {
          $match: {
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
      ]),
      
      // Failed requests count
      UsageLog.countDocuments({
        timestamp: { $gte: startDate },
        success: false,
      }),
      
      // Evaluation logs (blocked requests)
      EvaluationLog.countDocuments({
        createdAt: { $gte: startDate },
        llmFinalDecision: "BLOCK",
      }),
      
      // Total users
      User.countDocuments(),
      
      // Active users (users with requests in the time period)
      UsageLog.distinct("userId", {
        timestamp: { $gte: startDate },
      }).then(users => users.length),
    ]);

    const stats = successfulStats[0] || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
    };

    res.json({
      totalRequests: stats.totalRequests + failedCount,
      successfulRequests: stats.totalRequests,
      failedRequests: failedCount,
      blockedRequests: evaluationCount,
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      avgResponseTime: stats.avgResponseTime,
      totalUsers,
      activeUsers,
      period: `${days} days`,
      startDate,
      endDate: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get admin stats", { error });
    res.status(500).json({ error: "Failed to retrieve admin statistics" });
  }
}

/**
 * Get daily breakdown for admin dashboard
 */
export async function getAdminDailyStats(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const days = Math.min(parseInt(req.query.days as string) || 7, 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily successful requests
    const dailySuccessful = await UsageLog.aggregate([
      {
        $match: {
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
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get daily blocked requests
    const dailyBlocked = await EvaluationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          llmFinalDecision: "BLOCK",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          blocked: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Merge the two datasets
    const blockedMap = new Map(dailyBlocked.map(d => [d._id, d.blocked]));
    
    const mergedData = dailySuccessful.map(day => ({
      date: day._id,
      requests: day.requests,
      blocked: blockedMap.get(day._id) || 0,
      tokens: day.tokens,
      cost: day.cost,
    }));

    // Add days with only blocked requests
    dailyBlocked.forEach(day => {
      if (!dailySuccessful.find(d => d._id === day._id)) {
        mergedData.push({
          date: day._id,
          requests: 0,
          blocked: day.blocked,
          tokens: 0,
          cost: 0,
        });
      }
    });

    // Sort by date
    mergedData.sort((a, b) => a.date.localeCompare(b.date));

    res.json(mergedData);
  } catch (error) {
    logger.error("Failed to get admin daily stats", { error });
    res.status(500).json({ error: "Failed to retrieve daily statistics" });
  }
}

/**
 * Get usage breakdown by user for admin
 */
export async function getAdminUserStats(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userStats = await UsageLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          success: true,
        },
      },
      {
        $group: {
          _id: "$userId",
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$cost" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: "$_id",
          email: "$user.email",
          name: "$user.name",
          requests: 1,
          tokens: 1,
          cost: 1,
        },
      },
      {
        $sort: { requests: -1 },
      },
    ]);

    res.json(userStats);
  } catch (error) {
    logger.error("Failed to get admin user stats", { error });
    res.status(500).json({ error: "Failed to retrieve user statistics" });
  }
}

/**
 * Get model usage statistics for admin
 */
export async function getAdminModelStats(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const modelStats = await UsageLog.aggregate([
      {
        $match: {
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
    logger.error("Failed to get admin model stats", { error });
    res.status(500).json({ error: "Failed to retrieve model statistics" });
  }
}
