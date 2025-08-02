"use client";

import { User, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/login/login-actions";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export function AuthStatus() {
  const { user, loading, clearAuth } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAction();
      clearAuth();
      toast({
        title: "ログアウトしました",
        description: "ログインページにリダイレクトします",
      });
      router.push("/login");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      toast({
        title: "ログアウトに失敗しました",
        description: "再度お試しください",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
        <User className="h-4 w-4" />
        <span>認証状態を確認中...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mb-2">
          <User className="h-4 w-4 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-green-600 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
        <User className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">未ログイン</span>
      </div>
      <Link href="/login" className="w-full">
        <Button variant="default" size="sm" className="w-full flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          ログイン
        </Button>
      </Link>
    </div>
  );
}