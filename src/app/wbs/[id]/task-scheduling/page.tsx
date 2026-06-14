export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/actions/wbs-actions";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskSchedulingPage } from "@/components/task-scheduling/task-scheduling-page";

export default async function TaskSchedulingPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const idNum = Number((await params).id);

  const wbs = await getWbsById(idNum);
  if (!wbs) {
    notFound();
  }

  return (
    <div className="container mx-auto mt-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/wbs/${idNum}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              WBSに戻る
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h1 className="text-2xl font-bold">タスクスケジューリング</h1>
          </div>
        </div>
      </div>

      {/* WBS情報 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-lg">{wbs.name}</h2>
        <p className="text-gray-600 text-sm">
          タスクの依存関係（FS/SS/FF/SF・ラグ）と担当者の稼働カレンダーを考慮して、起点から前詰めで予定開始・終了日を自動算出します（DB保存はせず画面表示のみ。ラグは営業日換算）
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <TaskSchedulingPage wbsId={idNum} />
      </Suspense>
    </div>
  );
}
