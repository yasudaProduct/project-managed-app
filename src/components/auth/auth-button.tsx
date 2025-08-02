"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { User, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default function AuthButton() {
    const { user, logout, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Button variant="ghost" disabled>
                読み込み中...
            </Button>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href="/auth/login">ログイン</Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/register">新規登録</Link>
                </Button>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {user.displayName}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    ログアウト
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}