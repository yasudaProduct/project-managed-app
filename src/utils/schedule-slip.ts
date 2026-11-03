const MS_PER_DAY = 24 * 60 * 60 * 1000;

const utcDayNumber = (date: Date) =>
  Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);

/**
 * 基準日程からのずれ（スリップ日数）= 予定終了日 − 基準終了日（暦日）。
 * 正の値は基準より遅れ、負の値は前倒し。どちらかが未設定なら null。
 */
export function scheduleSlipDays(
  baselineEnd: Date | null | undefined,
  plannedEnd: Date | null | undefined
): number | null {
  if (!baselineEnd || !plannedEnd) return null;
  return utcDayNumber(new Date(plannedEnd)) - utcDayNumber(new Date(baselineEnd));
}
