import { useState, useEffect } from "react";
import { API_ENDPOINTS, apiCall } from "../config/api";

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  failedRequests: number;
}

export interface DailyUsage {
  _id: string;
  requests: number;
  tokens: number;
  cost: number;
  avgResponseTime: number;
}

export interface ModelUsage {
  _id: { model: string; provider: string };
  requests: number;
  tokens: number;
  cost: number;
  avgTokensPerRequest: number;
  isFree: boolean;
}

export interface LimitsStatus {
  rateLimits: {
    perMinute: { limit: number; used: number; remaining: number };
    perDay: { limit: number; used: number; remaining: number };
  };
  budget?: {
    monthlyLimit: number;
    currentSpent: number;
    remaining: number;
    percentUsed: number;
    lastResetDate: string;
  };
}

export interface UsageData {
  usageStats: UsageStats | null;
  dailyUsage: DailyUsage[];
  modelUsage: ModelUsage[];
  limitsStatus: LimitsStatus | null;
  loading: boolean;
}

export function useUsageData(enabled: boolean): UsageData {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [limitsStatus, setLimitsStatus] = useState<LimitsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;

    const load = async () => {
      try {
        const [stats, daily, models, limits] = await Promise.all([
          apiCall<UsageStats>(`${API_ENDPOINTS.usage.stats}?days=7`, { signal }),
          apiCall<DailyUsage[]>(`${API_ENDPOINTS.usage.daily}?days=7`, { signal }),
          apiCall<ModelUsage[]>(`${API_ENDPOINTS.usage.byModel}?days=30`, { signal }),
          apiCall<LimitsStatus>(API_ENDPOINTS.usage.limits, { signal }),
        ]);
        setUsageStats(stats);
        setDailyUsage(daily);
        setModelUsage(models);
        setLimitsStatus(limits);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error fetching usage data:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [enabled]);

  return { usageStats, dailyUsage, modelUsage, limitsStatus, loading };
}