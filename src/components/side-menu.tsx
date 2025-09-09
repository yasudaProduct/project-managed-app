"use client";

import Link from "next/link";
import {
  Calendar,
  FolderKanban,
  Home,
  Menu,
  Trello,
  Users,
  History,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthStatus } from "./auth/auth-status";
import { useState } from "react";

export function SideMenu() {
  const pathname = usePathname();
  const wbsId = getWbsIdFromPath(pathname);
  const [isOpen, setIsOpen] = useState(false);

  function getWbsIdFromPath(pathname: string): string | null {
    // /wbs/123, /wbs/123/xxx などにマッチ
    const match = pathname.match(/^\/wbs\/([0-9]+)/);
    return match ? match[1] : null;
  }

  return (
    <>
      {/* ホバー領域 */}
      <div
        className="fixed top-0 left-0 w-2 h-full z-40"
        onMouseEnter={() => setIsOpen(true)}
      />

      {/* サイドメニュー */}
      <div
        className={`fixed top-0 left-0 h-full w-[240px] sm:w-[300px] bg-background border-r shadow-lg transform transition-transform duration-200 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">menu</h2>
            <p className="text-sm text-muted-foreground">menu</p>
          </div>
          <nav className="flex flex-col space-y-2 text-md ">
            <Link
              href="/"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Home className="h-4 w-4" />
              ホーム
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <FolderKanban className="h-4 w-4" />
              プロジェクト
            </Link>
            <Link
              href="/users"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Users className="h-4 w-4" />
              ユーザー
            </Link>
            <Link
              href="/wbs/phase"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Trello className="h-4 w-4" />
              工程
            </Link>
            <Link
              href="/work-records"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Calendar className="h-4 w-4" />
              作業実績
            </Link>
            <Link
              href="/work-records/geppo"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Calendar className="h-4 w-4" />
              月報
            </Link>
            <Link
              href="/schedule/"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <Calendar className="h-4 w-4" />
              スケジュール取込
            </Link>
            <Link
              href="/company-holidays"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <CalendarCheck className="h-4 w-4" />
              会社休日管理
            </Link>
            <Link
              href="/evm"
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              EVM
            </Link>

            {wbsId && (
              <>
                <hr className="my-4" />
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">WBS管理</h3>
                  <p className="text-sm text-muted-foreground">WBS管理</p>
                </div>
                <Link
                  href={`/wbs/${wbsId}/dashboard`}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
                >
                  <Trello className="h-4 w-4" />
                  ダッシュボード
                </Link>
                <Link
                  href={`/wbs/${wbsId}`}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
                >
                  <Trello className="h-4 w-4" />
                  WBS
                </Link>
                <Link
                  href={`/wbs/${wbsId}/ganttv2`}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
                >
                  <Trello className="h-4 w-4" />
                  ガントチャートv2
                </Link>
                <Link
                  href={`/wbs/${wbsId}/ganttv3`}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
                >
                  <Trello className="h-4 w-4" />
                  ガントチャートv3
                </Link>
                <Link
                  href={`/wbs/${wbsId}/history`}
                  className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors"
                >
                  <History className="h-4 w-4" />
                  履歴
                </Link>
              </>
            )}
          </nav>

          {/* ログイン状況表示 */}
          <div className="mt-auto pt-6">
            <AuthStatus />
          </div>
        </div>
      </div>

      {/* メニューアイコン（視覚的ヒント） */}
      <div className="fixed top-2 left-2 z-30 pointer-events-none">
        <Menu className="h-4 w-4 text-muted-foreground" />
      </div>
    </>
  );
}
