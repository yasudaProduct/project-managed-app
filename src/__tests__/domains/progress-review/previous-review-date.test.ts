import { previousReviewDate } from '@/domains/progress-review/previous-review-date';

/**
 * 前回の確認時点（進捗確認サイクルから決める）。
 * 「前回からの変化」の比較基準に使う。日付は暦日（UTC深夜0時）。
 */
describe('previousReviewDate', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  // 土日を休みとする判定
  const isBusinessDay = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

  it('日次は前営業日（月曜なら前週の金曜）', () => {
    expect(iso(previousReviewDate('DAILY', d('2026-10-28'), isBusinessDay))).toBe('2026-10-27');
    expect(iso(previousReviewDate('DAILY', d('2026-11-02'), isBusinessDay))).toBe('2026-10-30');
  });

  it('週次は7日前', () => {
    expect(iso(previousReviewDate('WEEKLY', d('2026-10-31'), isBusinessDay))).toBe('2026-10-24');
  });

  it('月次は1ヶ月前（同じ日がなければ月末）', () => {
    expect(iso(previousReviewDate('MONTHLY', d('2026-10-31'), isBusinessDay))).toBe('2026-09-30');
    expect(iso(previousReviewDate('MONTHLY', d('2026-01-15'), isBusinessDay))).toBe('2025-12-15');
  });
});
