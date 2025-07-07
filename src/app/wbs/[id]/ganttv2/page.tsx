import React from "react";
import { getWbsById } from "../wbs-actions";
import { notFound } from "next/navigation";
import { getTaskAll } from "../wbs-task-actions";
import { Milestone, WbsTask } from "@/types/wbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CirclePlus,
  Trello,
  Users,
  ArrowLeft,
} from "lucide-react";
import { TaskModal } from "@/components/wbs/task-modal";
import { getMilestones } from "../milistone/action";
import GanttV2Component from "@/components/ganttv2/gantt-v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GanttV2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wbs = await getWbsById(parseInt(id));
  if (!wbs) {
    notFound();
  }

  const wbsTasks: WbsTask[] = await getTaskAll(wbs.id);
  const milestones: Milestone[] = await getMilestones(wbs.id);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/wbs/${wbs.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ガントチャート v2
            </h1>
            <p className="text-gray-600 mt-1">{wbs.name}</p>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trello className="h-5 w-5" />
            クイックアクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/wbs/${wbs.id}/phase/new`}>
              <Button variant="outline" className="bg-white hover:bg-gray-50">
                <CirclePlus className="h-4 w-4 mr-2" />
                <Trello className="h-4 w-4 mr-2" />
                工程作成
              </Button>
            </Link>
            <Link href={`/wbs/${wbs.id}/assignee/new`}>
              <Button variant="outline" className="bg-white hover:bg-gray-50">
                <CirclePlus className="h-4 w-4 mr-2" />
                <Users className="h-4 w-4 mr-2" />
                担当者追加
              </Button>
            </Link>
            <TaskModal wbsId={wbs.id}>
              <Button variant="outline" className="bg-white hover:bg-gray-50">
                <CirclePlus className="h-4 w-4 mr-2" />
                <CalendarCheck className="h-4 w-4 mr-2" />
                タスク作成
              </Button>
            </TaskModal>
          </div>
        </CardContent>
      </Card>

      {/* ガントチャート */}
      {wbsTasks && wbsTasks.length > 0 ? (
        <GanttV2Component tasks={wbsTasks} milestones={milestones} wbs={wbs} />
      ) : (
        <div className="w-full h-96 flex justify-center items-center">
          <div className="text-center text-gray-500">
            <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">タスクがありません</p>
            <p className="text-sm mt-2">新しいタスクを作成してください</p>
          </div>
        </div>
      )}
    </div>
  );
}
