/**
 * 月別の見通し工数配分
 *
 * タスク単位で算出された総見通し工数を、月別に配分する純粋関数。
 *
 * 設計方針:
 *   - 各月の見通しは `monthlyActual + planRatio * remainingForecast` とする
 *     - `remainingForecast = max(0, totalForecast - totalActual)`
 *     - `planRatio = monthlyPlanned / totalPlanned`（予定合計が 0 なら実績比率で代替）
 *   - この式により以下の不変条件を満たす:
 *     1. `monthlyForecast[m] >= monthlyActual[m]`（各月で見通しは実績を下回らない）
 *     2. `Σ monthlyForecast = max(totalForecast, totalActual)`
 *       - 進捗 100% の完了タスクでは `Σ = totalActual` となり各月の実績を反映
 *       - それ以外では `Σ = totalForecast` となりタスク総計と一致
 */

/**
 * タスクの総見通し工数を月別に配分する。
 *
 * @param totalForecast タスク全体の見通し工数（`ForecastCalculationService.calculateTaskForecast().forecastHours`）
 * @param plannedByMonth 月別予定工数（営業日按分の結果 / 開始日基準では単月）
 * @param actualByMonth 月別実績工数（`work_records` 由来）
 * @returns 月 → 見通し工数。キーは予定月と実績月の和集合。
 */
export function distributeForecastAcrossMonths(
  totalForecast: number,
  plannedByMonth: Map<string, number>,
  actualByMonth: Map<string, number>
): Map<string, number> {
  const totalActual = sumValues(actualByMonth);
  const totalPlanned = sumValues(plannedByMonth);
  const remainingForecast = Math.max(0, totalForecast - totalActual);

  const allMonths = new Set<string>([
    ...plannedByMonth.keys(),
    ...actualByMonth.keys(),
  ]);

  // 残見通しの配分比を決める基準: 通常は予定比、予定が全く無い場合は実績比で代替
  const ratioSource =
    totalPlanned > 0
      ? { source: plannedByMonth, total: totalPlanned }
      : totalActual > 0
        ? { source: actualByMonth, total: totalActual }
        : null;

  const result = new Map<string, number>();
  for (const month of allMonths) {
    const monthlyActual = actualByMonth.get(month) ?? 0;
    const ratio = ratioSource
      ? (ratioSource.source.get(month) ?? 0) / ratioSource.total
      : 0;
    result.set(month, monthlyActual + ratio * remainingForecast);
  }

  return result;
}

function sumValues(map: Map<string, number>): number {
  let sum = 0;
  for (const v of map.values()) sum += v;
  return sum;
}
