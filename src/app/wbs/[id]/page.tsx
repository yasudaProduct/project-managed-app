import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import {
  CalendarCheck,
  CirclePlus,
  Loader2,
  Trello,
  Users,
  Calendar,
  Clock,
  User,
  Shield,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDateyyyymmdd, getProjectStatusName } from "@/lib/utils";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import WbsSummaryCard from "@/components/wbs/wbs-summary-card";
import { getTaskAll } from "./wbs-task-actions";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { TaskModal } from "@/components/wbs/task-modal";
import { WbsTask } from "@/types/wbs";

export default async function WbsManagementPage({
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
    where: {
      id: wbs.projectId,
    },
  });
  if (!project) {
    notFound();
  }

  const tasks: WbsTask[] = await getTaskAll(wbs.id);

  const buffers = await getWbsBuffers(wbs.id);

  const phases = await getWbsPhases(wbs.id);

  const assignees = await getWbsAssignees(wbs.id);

  return (
    <>
      <div className="container mx-auto">
        {/* WBS Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">WBS: {wbs.name}</h1>

          {/* Project Information Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                プロジェクト情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>

              {/* Project Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      プロジェクト状況
                    </p>
                    <Badge variant="outline" className="bg-white">
                      {getProjectStatusName(project.status)}
                    </Badge>
                  </div>
                </div>

                {/* Period */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      プロジェクト期間
                    </p>
                    <p className="text-sm text-gray-700">
                      {formatDateyyyymmdd(project.startDate.toISOString())} ~{" "}
                      {formatDateyyyymmdd(project.endDate.toISOString())}
                    </p>
                  </div>
                </div>

                {/* Phases */}
                <div className="flex items-start gap-3">
                  <Trello className="h-4 w-4 text-blue-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">工程</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {phases.map((phase, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {phase.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-blue-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">担当者</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignees?.map((assignee, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-white"
                        >
                          {assignee.assignee?.displayName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buffers */}
              {buffers.length > 0 && (
                <div className="flex items-start gap-3 pt-2 border-t border-blue-100">
                  <Clock className="h-4 w-4 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      バッファ
                    </p>
                    <div className="space-y-1">
                      {buffers.map((buffer, index) => (
                        <div
                          key={index}
                          className="bg-white p-2 rounded border border-blue-100"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {buffer.bufferType}:
                          </span>
                          <span className="text-sm text-gray-600 ml-1">
                            {buffer.buffer}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({buffer.name})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <WbsSummaryCard wbsId={wbs.id} wbsTasks={tasks} />

        {/* Action Buttons */}
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <Link href={`/wbs/${wbs.id}/phase/new`}>
            <Button className="bg-white text-black">
              <CirclePlus className="h-4 w-4" />
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/phase`}>
            <Button className="bg-white text-black ml-2">
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/assignee/new`}>
            <Button className="bg-white text-black ml-2">
              <CirclePlus className="h-4 w-4" />
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/assignee`}>
            <Button className="bg-white text-black ml-2">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <TaskModal wbsId={wbs.id}>
            <Button className="bg-white text-black ml-2">
              <CirclePlus className="h-4 w-4" />
              <CalendarCheck className="h-4 w-4" />
            </Button>
          </TaskModal>
          <TaskTableViewPage wbsTasks={tasks} />
        </Suspense>
      </div>
    </>
  );
}
