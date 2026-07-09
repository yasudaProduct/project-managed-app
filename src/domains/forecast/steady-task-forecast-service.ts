/**
 * 定常タスク見通し工数計算サービス
 * 設計書：docs/specs/03-forecast-calculation.md
 *
 * 定常タスク（プロジェクト管理など、期間中ずっと一定工数を消費し「完了」概念を持たないタスク）は、
 * 進捗率ベースの通常見通し（ForecastCalculationService）に馴染まない。
 * 本サービスは、稼働日数を基準に「期間中の消化ペース」から見通し工数を算出する。
 */

import type { SteadyTaskForecastMode } from "@/types/scheduling-settings";

export interface SteadyForecastInput {
  /** 予定工数（h） */
  plannedHours: number;
  /** 実績工数（h） */
  actualHours: number;
  /** 予定期間全体の稼働日数 */
  totalWorkingDays: number;
  /** 予定開始日〜基準日（通常は「今日」。予定終了日でクランプ）の稼働日数 */
  elapsedWorkingDays: number;
}

export interface SteadyForecastOutput {
  /** 見通し工数（h） */
  forecastHours: number;
  /** 見通しバー用の日次消費ペース（h/営業日）。総稼働日数0など算出不能なら0 */
  dailyRate: number;
}

/**
 * 定常タスクの見通し工数と日次消費ペースを算出する。
 *
 * - PLANNED      : max(予定, 実績)。日次ペース = 予定 ÷ 総稼働日数
 * - ACTUAL_PACE  : (実績 ÷ 経過稼働日数) × 総稼働日数。日次ペース = 実績 ÷ 経過稼働日数
 * - PLANNED_PACE : 実績 + 残り稼働日数 × (予定 ÷ 総稼働日数)。日次ペース = 予定 ÷ 総稼働日数
 *
 * 実績なし・経過0日・期間なし等、算出に必要な情報が欠ける場合は PLANNED にフォールバックする。
 * いずれの方式でも「見通し ≥ 実績」の不変条件を満たす。
 */
export function calculateSteadyTaskForecast(
  mode: SteadyTaskForecastMode,
  input: SteadyForecastInput
): SteadyForecastOutput {
  const planned = Math.max(0, input.plannedHours || 0);
  const actual = Math.max(0, input.actualHours || 0);
  const total = Math.max(0, input.totalWorkingDays || 0);
  // 経過日数は [0, 総日数] にクランプ（基準日が予定終了日を超える場合は満了扱い）
  const elapsed = Math.min(Math.max(0, input.elapsedWorkingDays || 0), total);

  // PLANNED（フォールバック含む）: 予定ベース
  const plannedRate = total > 0 ? planned / total : 0;
  const plannedForecast: SteadyForecastOutput = {
    forecastHours: Math.max(planned, actual),
    dailyRate: plannedRate,
  };

  switch (mode) {
    case "ACTUAL_PACE": {
      if (actual > 0 && elapsed > 0) {
        const rate = actual / elapsed;
        return { forecastHours: rate * total, dailyRate: rate };
      }
      return plannedForecast;
    }

    case "PLANNED_PACE": {
      if (total > 0) {
        const remainingDays = Math.max(0, total - elapsed);
        return {
          forecastHours: actual + remainingDays * plannedRate,
          dailyRate: plannedRate,
        };
      }
      return plannedForecast;
    }

    case "PLANNED":
    default:
      return plannedForecast;
  }
}
