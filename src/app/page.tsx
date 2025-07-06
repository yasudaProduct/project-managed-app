import { getDashboardStats } from "./dashboard/dashboard-actions";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        <div className="mb-6"></div>
        <DashboardStats stats={stats} />
      </main>
    </div>
  );
}
