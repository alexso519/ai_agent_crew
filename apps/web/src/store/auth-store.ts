import { create } from "zustand";
import { persist } from "zustand/middleware";

import { clearAuthCookie, setAuthCookie } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setToken: (token: string) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      setToken: (token) => {
        setAuthCookie(token);
        set({ token, error: null });
      },
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => {
        clearAuthCookie();
        set({ token: null, user: null, error: null });
      },
      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: "crewcc_auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthCookie(state.token);
        }
      },
    },
  ),
);
