import { detectConsecutiveDecline } from '@/domains/progress-review/trend-deterioration';
import { recentReviewDates } from '@/domains/progress-review/previous-review-date';

/**
 * 悪化トレンドの検知（3-3）。進捗確認サイクルの単位で、指標が N 期連続で下がったかを見る。
 * 値は古い順。N 期連続の悪化には N+1 点が必要。
 */
describe('detectConsecutiveDecline', () => {
  it('直近 N 期すべてで前の期より下がっていれば true', () => {
    expect(detectConsecutiveDecline([1.0, 0.95, 0.92, 0.88], 3)).toBe(true);
  });

  it('途中で横ばい・上昇があれば false', () => {
    expect(detectConsecutiveDecline([1.0, 0.95, 0.95, 0.88], 3)).toBe(false);
    expect(detectConsecutiveDecline([1.0, 0.95, 0.97, 0.88], 3)).toBe(false);
  });

  it('見るのは直近 N 期だけ（それより前の上昇は問わない）', () => {
    expect(detectConsecutiveDecline([0.8, 1.0, 0.95, 0.92, 0.88], 3)).toBe(true);
  });

  it('点が足りない・未定義（null）を含むなら false', () => {
    expect(detectConsecutiveDecline([0.95, 0.92, 0.88], 3)).toBe(false);
    expect(detectConsecutiveDecline([null, 0.95, 0.92, 0.88], 3)).toBe(false);
  });

  it('計算誤差程度（0.001未満）の低下は悪化とみなさない', () => {
    expect(detectConsecutiveDecline([1.0, 0.9999, 0.9998, 0.9997], 3)).toBe(false);
  });
});

describe('recentReviewDates', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const iso = (dates: Date[]) => dates.map((date) => date.toISOString().slice(0, 10));
  const isBusinessDay = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

  it('今日から前回の確認日を指定回数さかのぼり、今日を含めて古い順に返す（週次）', () => {
    expect(iso(recentReviewDates('WEEKLY', d('2026-11-01'), isBusinessDay, 3))).toEqual([
      '2026-10-11',
      '2026-10-18',
      '2026-10-25',
      '2026-11-01',
    ]);
  });

  it('日次は営業日をさかのぼる', () => {
    expect(iso(recentReviewDates('DAILY', d('2026-11-03'), isBusinessDay, 2))).toEqual([
      '2026-10-30',
      '2026-11-02',
      '2026-11-03',
    ]);
  });
});
