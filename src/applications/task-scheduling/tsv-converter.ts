import type { TaskStatus } from "@/types/wbs";
import type {
  ScheduledTask,
  ScheduledTaskNote,
} from "@/domains/task-scheduling/scheduled-result";

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留",
};

const NOTE_LABELS: Record<ScheduledTaskNote, string> = {
  NORMAL: "",
  COMPLETED_FIXED: "完了(実績固定)",
  IN_PROGRESS_REMAINING: "進行中(残工数)",
  STEADY_FIXED_PERIOD: "定常",
  NO_ASSIGNEE: "担当者未設定",
  NO_YOTEI_KOSU: "予定工数未設定",
  STEADY_NO_PERIOD: "定常(期間未設定)",
  CYCLIC: "循環依存",
  SCHEDULE_OVERFLOW: "計算上限超過",
};

const HEADERS = [
  "タスクNo",
  "タスク名",
  "担当者",
  "フェーズ",
  "ステータス",
  "定常",
  "予定開始日",
  "予定終了日",
  "予定工数",
  "備考",
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * スケジューリング結果を TSV 文字列に変換する。
 */
export function convertScheduledTasksToTsv(results: ScheduledTask[]): string {
  const rows = results.map((r) => [
    r.taskNo,
    r.taskName,
    r.assigneeName ?? "",
    r.phaseName ?? "",
    STATUS_LABELS[r.status] ?? r.status,
    r.isSteady ? "○" : "",
    r.scheduledStartDate ? formatDate(r.scheduledStartDate) : "",
    r.scheduledEndDate ? formatDate(r.scheduledEndDate) : "",
    r.scheduledManHours != null ? String(r.scheduledManHours) : "",
    NOTE_LABELS[r.note] ?? "",
  ]);

  return [HEADERS, ...rows].map((row) => row.join("\t")).join("\n");
}
