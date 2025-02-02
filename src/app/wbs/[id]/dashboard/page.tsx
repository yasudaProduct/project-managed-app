import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskStatusCount } from "../wbs-task-actions";

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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">ダッシュボード - {wbs.name}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>タスク進捗</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>担当者</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              担当者を表示するコンポーネント
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>工程</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              工程を表示するコンポーネント
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
