import { getDashboardStats } from "./actions";
import DashboardOverview from "@/app/dashboard/_components/dashboard-overview";
import UpcomingDeadlines from "@/app/dashboard/_components/upcoming-deadlines";
import RecentActivity from "@/app/dashboard/_components/recent-activity";
import ActiveProjectsList from "@/app/dashboard/_components/active-projects-list";

export default async function DashboardPage() {
  const dashboardData = await getDashboardStats();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
      </div>

      <div className="space-y-6">
        <DashboardOverview stats={dashboardData.overview} />

        <ActiveProjectsList activeProjectsList={dashboardData.activeProjects} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UpcomingDeadlines
            upcomingDeadlines={dashboardData.timeline.upcomingDeadlines}
            overdueProjects={dashboardData.timeline.overdueProjects}
          />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
