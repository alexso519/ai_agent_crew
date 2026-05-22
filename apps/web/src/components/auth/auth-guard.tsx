"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrateUser, token, user } = useAuth();

  useEffect(() => {
    // 1. 如果正在載入中，不要進行任何轉址，給它一點時間初始化
    if (isLoading) return;

    // 2. 只有在確定已經「載入完畢」且「未登入」時，才進行轉址
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // 3. 處理 Hydration
    if (token && !user) {
      void hydrateUser();
    }
  }, [isAuthenticated, isLoading, hydrateUser, router, token, user]);

  // 渲染判斷：如果正在載入中，或者尚未通過認證，都顯示 Loading
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 只有當確定登入時，才顯示內容
  return <>{children}</>;
}