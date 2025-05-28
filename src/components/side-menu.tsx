"use client";

import Link from "next/link";
import { Calendar, Home, Menu, PlusCircle, Trello, Users } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { usePathname } from "next/navigation";

export function SideMenu() {
  const pathname = usePathname();
  const wbsId = getWbsIdFromPath(pathname);

  function getWbsIdFromPath(pathname: string): string | null {
    // /wbs/123, /wbs/123/xxx などにマッチ
    const match = pathname.match(/^\/wbs\/([^\/]+)/);
    return match ? match[1] : null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-40 bg-blue-100"
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
          <Link href="/" className="text-lg flex items-center gap-2">
            <Home className="h-4 w-4" />
            ホーム
          </Link>
          <Link
            href="/projects/new"
            className="text-lg flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            プロジェクト追加
          </Link>
          <Link href="/users" className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            ユーザー
          </Link>
          <Link href="/wbs/phase" className="text-lg flex items-center gap-2">
            <Trello className="h-4 w-4" />
            工程
          </Link>
          <Link
            href="/work-records"
            className="text-lg flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            🚧作業実績取込
          </Link>
          <Link href="/schedule/" className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            スケジュール取込
          </Link>
          <Link
            href="/schedule-generator"
            className="text-lg flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            予定自動作成
          </Link>

          {wbsId && (
            <>
              <hr className="my-4" />
              <SheetHeader>
                <SheetTitle>プロジェクト管理</SheetTitle>
                <SheetDescription>プロジェクト管理</SheetDescription>
              </SheetHeader>
              <Link
                href={`/wbs/${wbsId}/dashboard`}
                className="text-lg flex items-center gap-2"
              >
                <Trello className="h-4 w-4" />
                🚧ダッシュボード
              </Link>
              <Link
                href={`/wbs/${wbsId}`}
                className="text-lg flex items-center gap-2"
              >
                <Trello className="h-4 w-4" />
                🚧タスク
              </Link>
              <Link href="#" className="text-lg flex items-center gap-2">
                <Trello className="h-4 w-4" />
                🚧工程別集計
              </Link>
              <Link href="#" className="text-lg flex items-center gap-2">
                <Trello className="h-4 w-4" />
                🚧月別集計
              </Link>
              <Link
                href={`/wbs/${wbsId}/gantt`}
                className="text-lg flex items-center gap-2"
              >
                <Trello className="h-4 w-4" />
                🚧ガントチャート
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
