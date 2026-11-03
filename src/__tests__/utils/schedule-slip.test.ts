import { scheduleSlipDays } from '@/utils/schedule-slip';

/**
 * 基準日程からのずれ（スリップ日数）= 予定終了日 − 基準終了日（暦日）。
 * 正の値は基準より遅れ、負の値は前倒し。
 */
describe('scheduleSlipDays', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  it('予定終了日が基準終了日より後なら正の日数', () => {
    expect(scheduleSlipDays(d('2026-11-10'), d('2026-11-13'))).toBe(3);
  });

  it('前倒しなら負の日数、同じなら0', () => {
    expect(scheduleSlipDays(d('2026-11-10'), d('2026-11-08'))).toBe(-2);
    expect(scheduleSlipDays(d('2026-11-10'), d('2026-11-10'))).toBe(0);
  });

  it('時刻成分は無視して暦日で数える', () => {
    expect(
      scheduleSlipDays(new Date('2026-11-10T15:00:00.000Z'), new Date('2026-11-11T01:00:00.000Z'))
    ).toBe(1);
  });

  it('どちらかが未設定ならnull', () => {
    expect(scheduleSlipDays(undefined, d('2026-11-10'))).toBeNull();
    expect(scheduleSlipDays(d('2026-11-10'), null)).toBeNull();
  });
});
