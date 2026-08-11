/**
 * server/src/middleware/rateLimiter.ts
 *
 * Middleware for rate limiting and budget checking.
 * Prevents users from exceeding their request limits or monthly budget.
 */

import { Request, Response, NextFunction } from "express";
import { UsageLog } from "../models";
import logger from "../logger";
import { checkAndResetMonthlyBudget } from "../services/usageTracker";

/**
 * Checks rate limits for a user
 */
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user._id.toString();

    // Check and reset monthly budget if needed
    await checkAndResetMonthlyBudget(userId);

    // Get user's rate limits
    const rateLimits = user.rateLimits || {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
    };

    // Check requests per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const requestsLastMinute = await UsageLog.countDocuments({
      userId,
      timestamp: { $gte: oneMinuteAgo },
    });

    if (requestsLastMinute >= rateLimits.requestsPerMinute) {
      logger.warn("Rate limit exceeded (per minute)", {
        userId,
        requestsLastMinute,
        limit: rateLimits.requestsPerMinute,
      });

      res.setHeader("X-RateLimit-Limit", rateLimits.requestsPerMinute);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + 60);

      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Too many requests. Limit: ${rateLimits.requestsPerMinute} requests per minute`,
        retryAfter: 60,
      });
    }

    // Check requests per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestsLastDay = await UsageLog.countDocuments({
      userId,
      timestamp: { $gte: oneDayAgo },
    });

    if (requestsLastDay >= rateLimits.requestsPerDay) {
      logger.warn("Rate limit exceeded (per day)", {
        userId,
        requestsLastDay,
        limit: rateLimits.requestsPerDay,
      });

      const resetTime = new Date(oneDayAgo);
      resetTime.setDate(resetTime.getDate() + 1);
      const secondsUntilReset = Math.ceil(
        (resetTime.getTime() - Date.now()) / 1000
      );

      res.setHeader("X-RateLimit-Limit", rateLimits.requestsPerDay);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime.getTime() / 1000));

      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Daily limit reached. Limit: ${rateLimits.requestsPerDay} requests per day`,
        retryAfter: secondsUntilReset,
      });
    }

    // Check monthly budget for MANAGED mode
    if (user.mode === "MANAGED") {
      const costLimits = user.costLimits || {
        monthlyBudget: 1,
        currentMonthSpent: 0,
      };

      if (costLimits.currentMonthSpent >= costLimits.monthlyBudget) {
        logger.warn("Monthly budget exceeded", {
          userId,
          spent: costLimits.currentMonthSpent,
          budget: costLimits.monthlyBudget,
        });

        return res.status(402).json({
          error: "Budget exceeded",
          message: `Monthly budget of $${costLimits.monthlyBudget} has been exceeded. Current spending: $${costLimits.currentMonthSpent.toFixed(4)}`,
          currentSpending: costLimits.currentMonthSpent,
          monthlyBudget: costLimits.monthlyBudget,
        });
      }

      // Add budget info to headers
      res.setHeader(
        "X-Budget-Limit",
        costLimits.monthlyBudget.toFixed(2)
      );
      res.setHeader(
        "X-Budget-Remaining",
        (costLimits.monthlyBudget - costLimits.currentMonthSpent).toFixed(4)
      );
      res.setHeader(
        "X-Budget-Used",
        costLimits.currentMonthSpent.toFixed(4)
      );
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit-Minute", rateLimits.requestsPerMinute);
    res.setHeader(
      "X-RateLimit-Remaining-Minute",
      Math.max(0, rateLimits.requestsPerMinute - requestsLastMinute)
    );
    res.setHeader("X-RateLimit-Limit-Day", rateLimits.requestsPerDay);
    res.setHeader(
      "X-RateLimit-Remaining-Day",
      Math.max(0, rateLimits.requestsPerDay - requestsLastDay)
    );

    next();
  } catch (error) {
    logger.error("Rate limiter error", { error });
    // Don't block the request if rate limiting fails
    next();
  }
}

/**
 * Checks if a provider key is marked as free
 */
export function isProviderKeyFree(user: any, providerKeyId: string): boolean {
  const freeKeys = user.freeProviderKeys || [];
  return freeKeys.includes(providerKeyId);
}
