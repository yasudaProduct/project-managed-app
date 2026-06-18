import type { TaskStatus } from "@/types/wbs";

/**
 * スケジューリング計算の入力となる中立的なタスク値オブジェクト。
 * ドメイン Task 集約から必要な値だけを抽出し、WorkRecord 等への依存を隠蔽する。
 */
export interface SchedulingTask {
  taskId: number;
  taskNo: string;
  taskName: string;
  phaseId?: number;
  phaseName?: string;
  /** wbs_assignee.id（担当者）。未設定なら計算対象外 */
  assigneeId?: number;
  assigneeName?: string;
  status: TaskStatus;
  progressRate?: number;
  /** 予定（YOTEI）の開始日 */
  yoteiStartDate?: Date;
  /** 予定（YOTEI）の終了日 */
  yoteiEndDate?: Date;
  /** 予定工数（時間） */
  yoteiKosu?: number;
  /** 実績開始日（WorkRecord 由来） */
  jissekiStartDate?: Date;
  /** 実績終了日（WorkRecord 由来） */
  jissekiEndDate?: Date;
  /** 実績工数（時間, WorkRecord 合計） */
  jissekiKosu?: number;
}
