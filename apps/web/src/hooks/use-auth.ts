"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import { hasPermission, type Permission } from "@/lib/auth";
import {
  fetchCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";
import type { LoginCredentials, RegisterCredentials } from "@/types/auth";

export function useAuth() {
  const router = useRouter();
  const {
    token,
    user,
    isLoading,
    error,
    setToken,
    setUser,
    setLoading,
    setError,
    logout,
    isAuthenticated,
  } = useAuthStore();

  const hydrateUser = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser(token);
      setUser(currentUser);
      setError(null);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, setLoading, setUser, setError, logout]);

// 修正後的 useEffect，防止在載入過程中觸發無謂的 hydrate
  useEffect(() => {
    // 只有當「有 token」且「沒有 user 資料」且「不是正在載入中」時，才發起請求
    if (token && !user && !isLoading) {
      void hydrateUser();
    }
  }, [token, user, isLoading, hydrateUser]);

  const login = useCallback(
    async (credentials: LoginCredentials, redirectTo = "/control") => {
      setLoading(true);
      setError(null);
      try {
        const { token: accessToken } = await loginRequest(credentials);
        setToken(accessToken);
        const currentUser = await fetchCurrentUser(accessToken);
        setUser(currentUser);
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router, setToken, setUser, setLoading, setError],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setLoading(true);
      setError(null);
      try {
        await registerRequest(credentials);
        await login(credentials, "/control");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [login, setLoading, setError],
  );

  const signOut = useCallback(() => {
    logout();
    router.push("/login");
    router.refresh();
  }, [logout, router]);

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false;
      return hasPermission(user.role, permission);
    },
    [user],
  );

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated: isAuthenticated(),
    login,
    register,
    signOut,
    can,
    hydrateUser,
  };
}
