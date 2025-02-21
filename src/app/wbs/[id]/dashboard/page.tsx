import { notFound } from "next/navigation";
import { getAssignees, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskStatusCount } from "../wbs-task-actions";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Assignee } from "@/types/wbs";

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

  const taskStatusCoount = await getTaskStatusCount(Number(id));
  const assignees: Assignee[] = await getAssignees(Number(id));

  return (
    <div className="container mx-auto h-dvh py-10">
      <h1 className="text-3xl font-bold mb-6">ダッシュボード - {wbs.name}</h1>
      <ResizablePanelGroup
        direction="horizontal"
        className="max-w-full rounded-lg border md:min-w-[450px]"
      >
        <ResizablePanel defaultSize={50}>
          <div className="flex items-center justify-center">
            <Card className="w-full rounded-sm p-2 border-none">
              <CardHeader>
                <CardTitle>タスク</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  未着手：{taskStatusCoount.todo}
                </p>
                <p className="text-sm text-gray-500">
                  着手中：{taskStatusCoount.inProgress}
                </p>
                <p className="text-sm text-gray-500">
                  完了：{taskStatusCoount.completed}
                </p>
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={25}>
              <div className="flex h-full items-center justify-center p-6">
                <div className="flex flex-col">
                  <span className="font-semibold">担当者</span>
                  <div className="flex flex-col">
                    {assignees.map((assignee) => (
                      <span key={assignee.id}>{assignee.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75}>
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Three</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
