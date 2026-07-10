"use client";

import { useParams } from "next/navigation";
import { GanttV3Client } from "@/components/ganttv3/gantt-v3-client";

/**
 * WBS ルートの ganttv3 ページ。
 *
 * 以前はここに独自のガント実装（保存されないローカル編集・依存/ラグ非対応の
 * 簡易クリティカルパス計算など）を持っていたが、projects ルートと同じ
 * GanttV3Client を再利用して二重実装を解消した。
 */
export default function WbsGanttV3Page() {
  const params = useParams();
  const wbsId = Number(params.id);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-hidden">
        <GanttV3Client wbsId={wbsId} />
      </div>
    </div>
  );
}
