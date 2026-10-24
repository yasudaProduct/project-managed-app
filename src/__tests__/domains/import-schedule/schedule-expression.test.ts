import { ScheduleExpression } from '@/domains/import-schedule/schedule-expression';

/**
 * 定期インポートの実行タイミング（cron 式 + タイムゾーン）。
 * 入力・期待値は UTC の ISO 8601 で記述し、実行環境の TZ に依存しないことを確認する。
 */
describe('ScheduleExpression', () => {
  const JST = 'Asia/Tokyo';

  describe('create', () => {
    it('5フィールドの cron 式とタイムゾーンを保持する', () => {
      const expression = ScheduleExpression.create('0 9,12,17 * * *', JST);

      expect(expression.cronExpression).toBe('0 9,12,17 * * *');
      expect(expression.timezone).toBe(JST);
    });

    it('前後の空白は取り除く', () => {
      expect(ScheduleExpression.create('  0 3 * * *  ', JST).cronExpression).toBe('0 3 * * *');
    });

    it.each([
      ['範囲外の値', '61 * * * *'],
      ['フィールド不足', '0 3 * *'],
      ['秒付き（6フィールド）', '0 0 3 * * *'],
      ['空文字', ''],
      ['不正な文字列', 'every day'],
    ])('不正な cron 式（%s）は例外', (_, cronExpression) => {
      expect(() => ScheduleExpression.create(cronExpression, JST)).toThrow('実行タイミングの指定が不正です');
    });

    it('不正なタイムゾーンは例外', () => {
      expect(() => ScheduleExpression.create('0 3 * * *', 'Invalid/Zone')).toThrow('タイムゾーンの指定が不正です');
    });
  });

  describe('nextAfter', () => {
    it('毎日3:00（JST）: JST 10:00 の次は翌日 JST 3:00', () => {
      const expression = ScheduleExpression.create('0 3 * * *', JST);

      // 2026-10-24 10:00 JST = 2026-10-24T01:00Z
      expect(expression.nextAfter(new Date('2026-10-24T01:00:00.000Z')).toISOString()).toBe(
        '2026-10-24T18:00:00.000Z' // 2026-10-25 03:00 JST
      );
    });

    it('9時・12時・17時（JST）: JST 9:30 の次は同日 JST 12:00', () => {
      const expression = ScheduleExpression.create('0 9,12,17 * * *', JST);

      expect(expression.nextAfter(new Date('2026-10-24T00:30:00.000Z')).toISOString()).toBe(
        '2026-10-24T03:00:00.000Z'
      );
    });

    it('実行時刻ちょうどの場合は、その時刻ではなく次の実行時刻を返す', () => {
      const expression = ScheduleExpression.create('0 9,12,17 * * *', JST);

      // 2026-10-24 09:00 JST ちょうど → 12:00 JST
      expect(expression.nextAfter(new Date('2026-10-24T00:00:00.000Z')).toISOString()).toBe(
        '2026-10-24T03:00:00.000Z'
      );
    });

    it('9時・12時・17時（JST）: JST 17:00 を過ぎたら翌日 JST 9:00', () => {
      const expression = ScheduleExpression.create('0 9,12,17 * * *', JST);

      expect(expression.nextAfter(new Date('2026-10-24T08:00:01.000Z')).toISOString()).toBe(
        '2026-10-25T00:00:00.000Z'
      );
    });

    it('毎時: 次の正時', () => {
      const expression = ScheduleExpression.create('0 * * * *', JST);

      expect(expression.nextAfter(new Date('2026-10-24T01:59:59.000Z')).toISOString()).toBe(
        '2026-10-24T02:00:00.000Z'
      );
    });

    it('年末をまたぐ', () => {
      const expression = ScheduleExpression.create('0 3 * * *', JST);

      // 2026-12-31 10:00 JST → 2027-01-01 03:00 JST
      expect(expression.nextAfter(new Date('2026-12-31T01:00:00.000Z')).toISOString()).toBe(
        '2026-12-31T18:00:00.000Z'
      );
    });
  });
});
