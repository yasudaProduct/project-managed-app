"use client";

import { User, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/login/login-actions";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthHeader() {
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
      <Button variant="outline" size="sm" disabled>
        <User className="h-4 w-4 mr-2" />
        読み込み中...
      </Button>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            {user.displayName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>アカウント情報</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-sm text-gray-600">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard">ダッシュボード</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/login">
      <Button variant="default" size="sm" className="flex items-center gap-2">
        <LogIn className="h-4 w-4" />
        ログイン
      </Button>
    </Link>
  );
}