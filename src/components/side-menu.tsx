"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function SideMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-40"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>menu</SheetTitle>
          <SheetDescription>menu</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col space-y-4">
          <Link href="/" className="text-lg font-semibold">
            ホーム
          </Link>
          <Link href="/projects/new" className="text-lg">
            プロジェクト
          </Link>
          <Link href="/users" className="text-lg">
            ユーザー
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
