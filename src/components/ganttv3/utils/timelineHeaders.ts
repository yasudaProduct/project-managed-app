/**
 * 日付がその年の第何週かを返す（ローカルタイム基準の簡易計算）。
 * 週ヘッダのラベル "W{n}" に使用する。
 */
export function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}
