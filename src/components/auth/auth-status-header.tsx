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

export function AuthStatusHeader() {
  const { user, loading, clearAuth } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAction();
      clearAuth();
      toast({
        title: "ログアウトしました",
      });
      router.push("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      toast({
        title: "ログアウトに失敗しました",
        description:
          error instanceof Error ? error.message : "再度お試しください",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <User className="h-5 w-5" />
        <span>...</span>
      </div>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">{user.displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>アカウント</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-sm text-gray-600">
            {user.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>ログアウト</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/login">
      <Button variant="ghost" size="sm" className="flex items-center gap-2">
        <LogIn className="h-5 w-5" />
        <span>ログイン</span>
      </Button>
    </Link>
  );
}
