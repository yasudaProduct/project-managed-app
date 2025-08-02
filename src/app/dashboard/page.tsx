import { getDashboardStats } from "./dashboard-actions";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import ProjectStats from "@/components/dashboard/project-stats";
import TaskProgress from "@/components/dashboard/task-progress";
import UpcomingDeadlines from "@/components/dashboard/upcoming-deadlines";
import RecentActivity from "@/components/dashboard/recent-activity";
import ActiveProjectsList from "@/components/dashboard/active-projects-list";
import { AuthHeader } from "@/components/auth/auth-header";

export default async function DashboardPage() {
    const dashboardData = await getDashboardStats();

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">ダッシュボード</h1>
                <AuthHeader />
            </div>
            
            <div className="space-y-6">
                <DashboardOverview stats={dashboardData.overview} />
                
                <ActiveProjectsList activeProjectsList={dashboardData.activeProjects} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProjectStats projectsByStatus={dashboardData.projectsByStatus} />
                    <TaskProgress 
                        totalTasks={dashboardData.overview.totalTasks}
                        completedTasks={dashboardData.overview.completedTasks}
                        tasksByStatus={dashboardData.tasksByStatus}
                    />
                </div>
                
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