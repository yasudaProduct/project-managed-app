import type { BaselineMode } from "@/domains/task-scheduling/scheduling-options";

/**
 * 基準日モードから実際の基準日を解決する。
 * @param mode PROJECT_START / TODAY / CUSTOM
 * @param projectStartDate プロジェクト開始日
 * @param now 現在時刻（TODAY 用、テスト容易性のため引数化）
 * @param customIso CUSTOM 時の ISO8601 文字列
 */
export function resolveBaselineDate(
  mode: BaselineMode,
  projectStartDate: Date,
  now: Date,
  customIso?: string
): Date {
  switch (mode) {
    case "TODAY":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "CUSTOM":
      if (!customIso) {
        throw new Error("任意基準日が指定されていません");
      }
      return new Date(customIso);
    case "PROJECT_START":
    default:
      return projectStartDate;
  }
}
