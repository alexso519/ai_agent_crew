"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchPendingCount } from "@/services/approval-service";
import { useAuthStore } from "@/store/auth-store";

export function usePendingApprovals() {
  const token = useAuthStore((s) => s.token);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchPendingCount(token));
    } catch {
      setCount(0);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count, refresh };
}
