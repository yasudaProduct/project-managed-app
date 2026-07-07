import {
  utcDateKey,
  utcNextDayStartMs,
  utcDateFromYmd,
  addUtcMonthsClamped,
} from '../../utils/date-util';

/**
 * EVM・インポート系で使用するUTC日付ヘルパー。
 * サーバーTZに依存せずUTC暦日で日付境界を扱うためのユーティリティ。
 */
describe('date-util UTCヘルパー', () => {
  describe('utcDateKey', () => {
    it('UTC暦日のYYYY-MM-DDキーを返す', () => {
      expect(utcDateKey(new Date('2025-06-10T00:00:00.000Z'))).toBe('2025-06-10');
      expect(utcDateKey(new Date('2025-06-10T23:59:59.999Z'))).toBe('2025-06-10');
    });
  });

  describe('utcNextDayStartMs', () => {
    it('UTCでの翌日0時のエポックmsを返す', () => {
      const ms = utcNextDayStartMs(new Date('2025-06-10T15:30:00.000Z'));
      expect(new Date(ms).toISOString()).toBe('2025-06-11T00:00:00.000Z');
    });

    it('月末をまたぐ場合も正しく翌日を返す', () => {
      const ms = utcNextDayStartMs(new Date('2025-06-30T01:00:00.000Z'));
      expect(new Date(ms).toISOString()).toBe('2025-07-01T00:00:00.000Z');
    });
  });

  describe('utcDateFromYmd', () => {
    it('年月日からUTC深夜0時のDateを生成する', () => {
      const d = utcDateFromYmd(2025, 6, 10);
      expect(d.toISOString()).toBe('2025-06-10T00:00:00.000Z');
    });
  });

  describe('addUtcMonthsClamped', () => {
    it('月を加算する（同日維持）', () => {
      const d = addUtcMonthsClamped(new Date('2025-01-15T00:00:00.000Z'), 2);
      expect(d.toISOString()).toBe('2025-03-15T00:00:00.000Z');
    });

    it('加算先の月に同日が無い場合は月末にクランプする', () => {
      // 1/31 + 1ヶ月 → 2/28（2/31に繰り上がらない）
      const d = addUtcMonthsClamped(new Date('2025-01-31T00:00:00.000Z'), 1);
      expect(d.toISOString()).toBe('2025-02-28T00:00:00.000Z');
    });

    it('クランプはドリフトしない（常に開始日基準で計算）', () => {
      // 1/31 + 2ヶ月 → 3/31（2月経由で28日に落ちたまま進まない）
      const d = addUtcMonthsClamped(new Date('2025-01-31T00:00:00.000Z'), 2);
      expect(d.toISOString()).toBe('2025-03-31T00:00:00.000Z');
    });

    it('閏年の2月は29日にクランプする', () => {
      const d = addUtcMonthsClamped(new Date('2024-01-31T00:00:00.000Z'), 1);
      expect(d.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });
  });
});
