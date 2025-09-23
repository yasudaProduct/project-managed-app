"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/date-util";

interface DashboardStatsProps {
  stats: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalWbs: number;
    projectsByStatus: { status: string; count: number }[];
    tasksByStatus: { status: string; count: number }[];
    upcomingDeadlines: {
      projectId: string;
      projectName: string;
      endDate: Date;
    }[];
    overdueProjects: {
      projectId: string;
      projectName: string;
      endDate: Date;
    }[];
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const router = useRouter();
  const taskCompletionRate =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;
  const activeProjectRate =
    stats.totalProjects > 0
      ? Math.round((stats.activeProjects / stats.totalProjects) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          onClick={() => router.push("/projects")}
          className="cursor-pointer hover:bg-gray-100"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総プロジェクト数
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              活動中: {stats.activeProjects} ({activeProjectRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              完了: {stats.completedTasks} ({taskCompletionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WBS数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWbs}</div>
            <p className="text-xs text-muted-foreground">全プロジェクト合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進捗率</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskCompletionRate}%</div>
            <Progress value={taskCompletionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              プロジェクト状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.projectsByStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              タスク状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.tasksByStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.status === "COMPLETED" ? "default" : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.upcomingDeadlines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                締切が近いプロジェクト
              </CardTitle>
              <CardDescription>
                7日以内に期限を迎えるプロジェクト
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.upcomingDeadlines.slice(0, 5).map((project) => (
                  <div
                    key={project.projectId}
                    className="flex items-center justify-between p-2 bg-orange-50 rounded"
                  >
                    <div>
                      <p className="font-medium">{project.projectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(project.endDate, "YYYY/MM/DD")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      急ぎ
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {stats.overdueProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                期限超過プロジェクト
              </CardTitle>
              <CardDescription>期限を過ぎているプロジェクト</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.overdueProjects.slice(0, 5).map((project) => (
                  <div
                    key={project.projectId}
                    className="flex items-center justify-between p-2 bg-red-50 rounded"
                  >
                    <div>
                      <p className="font-medium">{project.projectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(project.endDate, "YYYY/MM/DD")}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      遅延
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
