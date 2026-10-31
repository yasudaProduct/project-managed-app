import type { ProgressReviewCycle } from '@/types/progress-review-cycle';

/**
 * 前回の確認時点（ドメインサービス）。
 * 進捗確認サイクルから「前回からの変化」の比較基準日を決める。日付は暦日（UTC深夜0時）。
 * - 日次: 前営業日（月曜なら前週の金曜）
 * - 週次: 7日前
 * - 月次: 1ヶ月前（同じ日がなければその月の末日）
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function oneMonthBefore(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() - 1;
  // Date.UTC(y, m+1, 0) は対象月の末日
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function previousReviewDate(
  cycle: ProgressReviewCycle,
  today: Date,
  isBusinessDay: (date: Date) => boolean
): Date {
  switch (cycle) {
    case 'DAILY': {
      let time = today.getTime() - MS_PER_DAY;
      while (!isBusinessDay(new Date(time))) time -= MS_PER_DAY;
      return new Date(time);
    }
    case 'WEEKLY':
      return new Date(today.getTime() - 7 * MS_PER_DAY);
    case 'MONTHLY':
      return oneMonthBefore(today);
  }
}
