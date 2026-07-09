import type { Task } from "../gantt";

/** 予定日(Date)をタスクリスト表示用に MM/DD へ整形する（ローカル基準） */
export function formatMonthDay(date?: Date): string {
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

/** 日付を YYYY/MM/DD へ整形する（ローカル基準。ツールチップ/詳細サイドバー用） */
export function formatYmd(date?: Date): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/** 工数(時間)を小数第1位までに丸めて "12.5h" のように整形する（実績/見通し工数の表示用） */
export function formatHours(hours?: number): string | undefined {
  if (hours === undefined) return undefined;
  return `${Math.round(hours * 10) / 10}h`;
}

/** ステータスを表す色（左リストのステータスドット用） */
export function statusColor(status: Task["status"]): string {
  switch (status) {
    case "COMPLETED":
      return "#10B981"; // green
    case "IN_PROGRESS":
      return "#3B82F6"; // blue
    case "ON_HOLD":
      return "#F59E0B"; // amber
    case "NOT_STARTED":
    default:
      return "#9CA3AF"; // gray
  }
}
