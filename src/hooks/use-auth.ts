"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/app/(auth)/login/login-actions";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setUser(null);
        return;
      }
      setUser({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        displayName: currentUser.displayName
      });
    } catch (err) {
      console.error("認証状態の確認に失敗しました:", err);
      setError(err instanceof Error ? err.message : "認証状態の確認に失敗しました");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = () => {
    checkAuthStatus();
  };

  const clearAuth = () => {
    setUser(null);
    setError(null);
  };

  useEffect(() => {
    // 初回マウントおよびルート遷移時に認証状態を再取得
    checkAuthStatus();
  }, [pathname]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    refreshAuth,
    clearAuth,
  };
}