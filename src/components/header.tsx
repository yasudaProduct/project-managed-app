"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthStatusHeader } from "./auth/auth-status-header";
import Link from "next/link";

interface WbsInfo {
  id: string;
  name: string;
  projectName: string;
}

export function Header() {
  const pathname = usePathname();
  const [wbsInfo, setWbsInfo] = useState<WbsInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const getWbsIdFromPath = (path: string): string | null => {
    const match = path.match(/^\/wbs\/([^\/]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const wbsId = getWbsIdFromPath(pathname);

    if (wbsId) {
      setLoading(true);

      import("@/app/actions/wbs").then(({ getWbsById }) => {
        getWbsById(wbsId)
          .then((data) => {
            if (data && data.name) {
              setWbsInfo({
                id: wbsId,
                name: data.name,
                projectName: data.projectName,
              });
            } else {
              setWbsInfo({
                id: wbsId,
                name: `WBS: ${wbsId}`,
                projectName: `プロジェクト: ${wbsId}`,
              });
            }
          })
          .catch((error) => {
            console.error("Failed to fetch WBS info:", error);
            setWbsInfo({
              id: wbsId,
              name: `WBS: ${wbsId}`,
              projectName: `プロジェクト: ${wbsId}`,
            });
          })
          .finally(() => {
            setLoading(false);
          });
      });
    } else {
      setWbsInfo(null);
    }
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname === "/") return "ホーム";
    if (pathname.startsWith("/projects")) return "プロジェクト";
    if (pathname.startsWith("/users")) return "ユーザー";
    if (pathname.startsWith("/wbs/phase")) return "工程";
    if (pathname.startsWith("/work-records/geppo")) return "月報";
    if (pathname.startsWith("/work-records")) return "作業実績";
    if (pathname.startsWith("/schedule")) return "スケジュール";
    if (pathname.startsWith("/schedule-generator")) return "予定自動作成";

    if (pathname.includes("/dashboard")) return "ダッシュボード";
    if (pathname.includes("/ganttv2")) return "ガントチャート";
    if (pathname.includes("/milestone")) return "マイルストーン管理";
    if (pathname.includes("/wbs/")) return "タスク";

    return "プロジェクト管理";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-8 px-4 pl-20">
        {/* Left side - Page title and WBS info */}
        <div className="flex items-center space-x-4">
          <h1 className="font-semibold text-gray-900 text-sm">
            {getPageTitle()}
          </h1>

          {wbsInfo && !loading && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">プロジェクト:</span>
                <span className="text-sm font-medium text-gray-900">
                  <Link href={`/wbs/${wbsInfo.id}`}>{wbsInfo.projectName}</Link>
                </span>
              </div>
            </>
          )}

          {loading && (
            <>
              <span className="text-gray-400">|</span>
              <div className="text-sm text-gray-500">読み込み中...</div>
            </>
          )}
        </div>

        {/* Right side - Auth status */}
        <div className="flex items-center">
          <AuthStatusHeader />
        </div>
      </div>
    </header>
  );
}
