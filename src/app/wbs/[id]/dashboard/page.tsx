import { notFound } from "next/navigation";
import { getAssignees, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskStatusCount, getTaskProgressByPhase, getKosuSummary, getMilestones } from "../wbs-task-actions";
import { Assignee } from "@/types/wbs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDateyyyymmdd, getProjectStatusName } from "@/lib/utils";
import prisma from "@/lib/prisma";
import {
  CalendarCheck,
  CirclePlus,
  Clock,
  TrendingUp,
  Target,
  Users,
  Trello,
  Calendar,
  User,
  Shield,
  BarChart3,
  Activity,
  Flag,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/wbs/task-modal";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  const project = await prisma.projects.findUnique({
    where: { id: wbs.projectId },
  });
  if (!project) {
    notFound();
  }

  const taskStatusCount = await getTaskStatusCount(Number(id));
  const assignees: Assignee[] = await getAssignees(Number(id));
  const taskProgressByPhase = await getTaskProgressByPhase(Number(id));
  const kosuSummary = await getKosuSummary(Number(id));
  const milestones = await getMilestones(Number(id));
  
  const totalTasks = taskStatusCount.todo + taskStatusCount.inProgress + taskStatusCount.completed;
  const completionRate = totalTasks > 0 ? Math.round((taskStatusCount.completed / totalTasks) * 100) : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-1">{wbs.name}</p>
        </div>
        <Badge 
          variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
          className="text-sm"
        >
          {getProjectStatusName(project.status)}
        </Badge>
      </div>

      {/* プロジェクト概要 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            プロジェクト概要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-700">{project.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 font-medium">プロジェクト期間</p>
                <p className="text-sm text-gray-700">
                  {formatDateyyyymmdd(project.startDate.toISOString())} ~ {formatDateyyyymmdd(project.endDate.toISOString())}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 font-medium">進捗率</p>
                <div className="flex items-center gap-2">
                  <Progress value={completionRate} className="w-20" />
                  <span className="text-sm font-medium">{completionRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メインダッシュボード */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* タスク状況 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              タスク状況
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">未着手</span>
              <Badge variant="secondary" className="bg-gray-100">
                {taskStatusCount.todo}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">着手中</span>
              <Badge variant="default" className="bg-blue-500">
                {taskStatusCount.inProgress}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">完了</span>
              <Badge variant="default" className="bg-green-500">
                {taskStatusCount.completed}
              </Badge>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">合計</span>
                <span className="text-sm font-bold">{totalTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 担当者 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              担当者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{assignee.displayName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(assignee.rate * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* クイックアクション */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              クイックアクション
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/wbs/${wbs.id}/phase/new`}>
              <Button variant="outline" className="w-full justify-start">
                <CirclePlus className="h-4 w-4 mr-2" />
                <Trello className="h-4 w-4 mr-2" />
                工程作成
              </Button>
            </Link>
            <Link href={`/wbs/${wbs.id}/assignee/new`}>
              <Button variant="outline" className="w-full justify-start">
                <CirclePlus className="h-4 w-4 mr-2" />
                <Users className="h-4 w-4 mr-2" />
                担当者追加
              </Button>
            </Link>
            <TaskModal wbsId={wbs.id}>
              <Button variant="outline" className="w-full justify-start">
                <CirclePlus className="h-4 w-4 mr-2" />
                <CalendarCheck className="h-4 w-4 mr-2" />
                タスク作成
              </Button>
            </TaskModal>
          </CardContent>
        </Card>
      </div>

      {/* 工程別進捗 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            工程別進捗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taskProgressByPhase.map((phase) => {
              const phaseCompletionRate = phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
              return (
                <div key={phase.phase} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{phase.phase}</span>
                    <span className="text-sm text-gray-500">
                      {phase.completed}/{phase.total} ({phaseCompletionRate}%)
                    </span>
                  </div>
                  <Progress value={phaseCompletionRate} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>未着手: {phase.todo}</span>
                    <span>着手中: {phase.inProgress}</span>
                    <span>完了: {phase.completed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 工数管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            工数管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(kosuSummary).map(([phaseName, kosu]) => (
              <div key={phaseName} className="space-y-2">
                <h4 className="font-medium text-sm">{phaseName}</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500">基準</p>
                    <p className="font-medium">{kosu.kijun}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">予定</p>
                    <p className="font-medium">{kosu.yotei}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">実績</p>
                    <p className="font-medium">{kosu.jisseki}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* マイルストーン */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flag className="h-5 w-5" />
              マイルストーン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">{milestone.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatDateyyyymmdd(milestone.date.toISOString())}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
