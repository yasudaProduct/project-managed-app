import { getDashboardStats } from "./dashboard/dashboard-actions";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">プロジェクト管理ダッシュボード</h1>
          <p className="text-muted-foreground">
            全てのプロジェクトの状況を一覧で確認できます
          </p>
        </div>
        <DashboardStats stats={stats} />
      </main>
    </div>
  );
}
