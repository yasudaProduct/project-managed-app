"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthHeader } from "./auth/auth-header";
import { NotificationCenter } from "./notification/NotificationCenter";
import { useAuth } from "@/hooks/use-auth";

interface ProjectInfo {
  id: string;
  name: string;
  wbsId?: number;
}

interface WbsTasksSummary {
  taskKosu: number;
  taskJisseki: number;
}

export function Header() {
  const pathname = usePathname();
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [tasksSummary, setTasksSummary] = useState<WbsTasksSummary | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, clearAuth } = useAuth();

  const getProjectIdFromPath = (path: string): string | null => {
    // /projects/[id] のパターンにマッチ
    const match = path.match(/^\/projects\/([^/]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const projectId = getProjectIdFromPath(pathname);

    if (projectId) {
      setLoading(true);

      // プロジェクト情報と最新のWBS情報を取得
      Promise.all([
        import("@/app/projects/actions").then(({ getProjectById }) =>
          getProjectById(projectId)
        ),
        import("@/app/projects/[id]/wbs/wbs-actions").then(
          ({ getLatestWbsByProjectId }) => getLatestWbsByProjectId(projectId)
        ),
      ])
        .then(([projectData, wbsData]) => {
          if (projectData) {
            setProjectInfo({
              id: projectId,
              name: projectData.name,
              wbsId: wbsData?.id,
            });

            // WBSが存在する場合はタスクサマリーも取得
            if (wbsData?.id) {
              import("@/app/actions/get-wbs-summary").then(({ getWbsTasksSummary }) => {
                getWbsTasksSummary(String(wbsData.id)).then((summaryData) => {
                  if (summaryData) {
                    setTasksSummary(summaryData);
                  }
                });
              });
            }
          }
        })
        .catch((error) => {
          console.error("Failed to fetch project info:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setProjectInfo(null);
      setTasksSummary(null);
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
        {/* 左側 - ページタイトルとWBS情報 */}
        <div className="flex items-center space-x-4">
          <h1 className="font-semibold text-gray-900 text-sm">
            {getPageTitle()}
          </h1>

          {projectInfo && !loading && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">プロジェクト:</span>
                <span className="text-sm font-medium text-gray-900">
                  <Link href={`/projects/${projectInfo.id}`}>
                    {projectInfo.name}
                  </Link>
                </span>
              </div>

              {tasksSummary && (
                <>
                  <span className="text-gray-400">|</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">予定:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {tasksSummary.taskKosu.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">実績:</span>
                      <span className="text-sm font-medium text-green-600">
                        {tasksSummary.taskJisseki.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">進捗:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {tasksSummary.taskKosu > 0
                          ? `${(
                            (tasksSummary.taskJisseki /
                              tasksSummary.taskKosu) *
                            100
                          ).toFixed(1)}%`
                          : "0.0%"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {loading && (
            <>
              <span className="text-gray-400">|</span>
              <div className="text-sm text-gray-500">読み込み中...</div>
            </>
          )}
        </div>

        {/* 右側 - 通知と認証ステータス */}
        <div className="flex items-center space-x-2">
          {!authLoading && user && (
            <>
              <NotificationCenter />
            </>
          )}
          <AuthHeader />
        </div>
      </div>
    </header>
  );
}
