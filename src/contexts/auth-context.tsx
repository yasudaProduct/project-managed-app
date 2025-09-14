"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/domains/auth/user";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期ユーザー情報を設定
    setUser(initialUser);
    setIsLoading(false);
  }, [initialUser]);

  const login = (user: User) => {
    setUser(user);
  };

  const logout = async () => {
    try {
      // サーバーサイドのログアウト処理を呼び出し
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
        // ログイン画面にリダイレクト
        window.location.href = "/auth/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      // エラーが発生してもクライアント側ではログアウト状態にする
      setUser(null);
      window.location.href = "/auth/login";
    }
  };

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.user) {
          setUser(
            new User(
              userData.user.id,
              userData.user.email,
              userData.user.name,
              userData.user.displayName
            )
          );
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
