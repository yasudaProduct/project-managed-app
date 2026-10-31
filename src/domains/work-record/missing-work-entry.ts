/**
 * 実績（月報）の入力漏れ検出（ドメインサービス）。
 * 作業者は月報を毎日入力する運用のため、
 * 「営業日・予定タスクあり・全日休暇でない・実績0時間」の日を入力漏れとする。
 * 日付はすべて暦日（UTC深夜0時）で扱い、キーは YYYY-MM-DD。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 予定期間（両端を含む） */
export type PlannedPeriod = {
  start: Date;
  end: Date;
};

export type MissingWorkEntryInput = {
  businessDays: ReadonlyArray<Date>;
  plannedPeriods: ReadonlyArray<PlannedPeriod>;
  /** 実績時間が0より大きい日 */
  recordedDateKeys: ReadonlySet<string>;
  /** 全日休暇の日 */
  dayOffDateKeys: ReadonlySet<string>;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * 終了日（含む）から遡って営業日を指定件数集め、古い順に返す。
 */
export function listRecentBusinessDays(
  isBusinessDay: (date: Date) => boolean,
  endInclusive: Date,
  count: number
): Date[] {
  const days: Date[] = [];
  for (
    let time = endInclusive.getTime();
    days.length < count;
    time -= MS_PER_DAY
  ) {
    const day = new Date(time);
    if (isBusinessDay(day)) days.unshift(day);
  }
  return days;
}

export function findMissingWorkEntryDates(input: MissingWorkEntryInput): Date[] {
  return input.businessDays.filter((day) => {
    const key = dateKey(day);
    if (input.recordedDateKeys.has(key) || input.dayOffDateKeys.has(key)) return false;
    const time = day.getTime();
    return input.plannedPeriods.some(
      (period) => period.start.getTime() <= time && time <= period.end.getTime()
    );
  });
}
