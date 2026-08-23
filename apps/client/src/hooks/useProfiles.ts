import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS, apiCall } from "../config/api";

export interface Profile {
  _id: string;
  name: string;
  createdBy: string;
  creatorEmail: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<Profile[]>(API_ENDPOINTS.profiles, { signal });
      setProfiles(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("שגיאה בטעינת הפרופילים");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(controller.signal);
    return () => controller.abort();
  }, [fetch]);

  return { profiles, loading, error, refetch: fetch };
}