import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTargetWbsList } from "./actions";
import { CrossProjectGanttChart } from "./_components/cross-project-gantt-chart";

export const dynamic = "force-dynamic";

export default async function CrossProjectAssigneeGanttPage() {
  const targets = await getTargetWbsList();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          担当者負荷（プロジェクト横断）
        </h1>
        <p className="text-gray-600 mt-1">
          未開始・進行中プロジェクトの最新WBSを横断して、担当者の日別作業負荷を合算表示します
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">対象プロジェクト / WBS</CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-sm text-gray-500">
              対象のWBSがありません（未開始・進行中のプロジェクトが存在しません）
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-sm">
              {targets.map((target) => (
                <li
                  key={target.wbsId}
                  className="px-2 py-1 bg-gray-100 rounded"
                >
                  {target.projectName}
                  <span className="text-gray-500"> / {target.wbsName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CrossProjectGanttChart />
    </div>
  );
}
