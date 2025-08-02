"use client";

import { useEffect, useState } from "react";
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

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
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
    checkAuthStatus();
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    refreshAuth,
    clearAuth,
  };
}