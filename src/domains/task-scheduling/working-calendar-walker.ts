/**
 * 担当者の稼働カレンダー。スケジューリングエンジンが依存する最小インターフェース。
 * AssigneeWorkingCalendar がこれを満たす（getAvailableHours を持つ）。
 */
export interface WorkingCalendar {
  getAvailableHours(date: Date): number;
}

/** 無限ループ防止のための反復上限（約5年） */
const MAX_ITERATION_DAYS = 366 * 5;

/** 浮動小数の残差（按分等で生じる）を稼働ゼロとみなす閾値 */
const HOURS_EPSILON = 1e-8;

/** ローカルタイム基準の日付キー（YYYY-MM-DD）。AssigneeWorkingCalendar の日付扱いに合わせる。 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** カレンダー日を加算した新しい Date を返す（元は変更しない） */
export function addCalendarDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

/** consumed（定常タスク・先行タスクの消費）を差し引いた実効稼働時間 */
function effectiveHours(
  date: Date,
  cal: WorkingCalendar,
  consumed?: Map<string, number>
): number {
  const avail = cal.getAvailableHours(date);
  const used = consumed?.get(toDateKey(date)) ?? 0;
  const hours = avail - used;
  return hours > HOURS_EPSILON ? hours : 0;
}

/**
 * from 以降で実効稼働時間が正になる最初の日を返す。
 * 全日稼働0でも上限で打ち切る（その場合 from + 上限日 を返す）。
 */
export function nextAvailableDay(
  from: Date,
  cal: WorkingCalendar,
  consumed?: Map<string, number>
): Date {
  let cur = new Date(from);
  let iter = 0;
  while (effectiveHours(cur, cal, consumed) <= 0 && iter < MAX_ITERATION_DAYS) {
    cur = addCalendarDays(cur, 1);
    iter++;
  }
  return cur;
}

/** date の翌日以降で実効稼働時間が正になる最初の日 */
export function nextBusinessDay(
  date: Date,
  cal: WorkingCalendar,
  consumed?: Map<string, number>
): Date {
  return nextAvailableDay(addCalendarDays(date, 1), cal, consumed);
}

/**
 * start から残工数を消化し終える終了日を求める。
 * 各日の消化量は min(実効稼働, 残工数) で、実際に消化した分を consumed に記録する
 * （consumed は呼び出し側が所有し、同一担当者の後続タスクが同日の残余稼働を使えるようにする）。
 * @returns endDate=工数を消化した最後の稼働日, overflow=上限まで消化し切れなかったか
 */
export function consumeUntilDone(
  start: Date,
  hours: number,
  cal: WorkingCalendar,
  consumed?: Map<string, number>
): { endDate: Date; overflow: boolean } {
  let remaining = hours;
  let cur = new Date(start);
  let lastWorked = new Date(start);
  let iter = 0;
  while (remaining > HOURS_EPSILON && iter < MAX_ITERATION_DAYS) {
    const avail = effectiveHours(cur, cal, consumed);
    if (avail > 0) {
      const use = Math.min(avail, remaining);
      remaining -= use;
      if (consumed) {
        const key = toDateKey(cur);
        consumed.set(key, (consumed.get(key) ?? 0) + use);
      }
      lastWorked = new Date(cur);
      if (remaining > HOURS_EPSILON) {
        cur = addCalendarDays(cur, 1);
      }
    } else {
      cur = addCalendarDays(cur, 1);
    }
    iter++;
  }
  return { endDate: lastWorked, overflow: remaining > HOURS_EPSILON };
}

/** start〜end（両端含む）の稼働日数を数える */
export function countWorkingDays(
  start: Date,
  end: Date,
  cal: WorkingCalendar
): number {
  let count = 0;
  let cur = new Date(start);
  let iter = 0;
  while (cur.getTime() <= end.getTime() && iter < MAX_ITERATION_DAYS) {
    if (cal.getAvailableHours(cur) > 0) count++;
    cur = addCalendarDays(cur, 1);
    iter++;
  }
  return count;
}
