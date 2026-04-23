import { describe, it, expect } from '@jest/globals';
import { distributeForecastAcrossMonths } from '@/applications/wbs/query/monthly-forecast-distributor';

describe('distributeForecastAcrossMonths', () => {
  describe('基本動作', () => {
    it('予定月と実績月が一致する標準ケースで、各月に実績+残見通し按分が配分される', () => {
      // 総見通し 100h、総実績 25h => 残見通し 75h
      // 1月: 予定50h / 実績25h => 25 + (50/100)*75 = 62.5
      // 2月: 予定50h / 実績0h  => 0 + (50/100)*75 = 37.5
      const planned = new Map([['2024/01', 50], ['2024/02', 50]]);
      const actual = new Map([['2024/01', 25]]);

      const result = distributeForecastAcrossMonths(100, planned, actual);

      expect(result.get('2024/01')).toBeCloseTo(62.5, 5);
      expect(result.get('2024/02')).toBeCloseTo(37.5, 5);
    });

    it('結果のキーは予定月と実績月の和集合である', () => {
      const planned = new Map([['2024/01', 50]]);
      const actual = new Map([['2024/02', 30]]);

      const result = distributeForecastAcrossMonths(80, planned, actual);

      expect(Array.from(result.keys()).sort()).toEqual(['2024/01', '2024/02']);
    });

    it('配分後の総計は totalForecast と一致する（残見通しが残予定で完全按分できる場合）', () => {
      const planned = new Map([['2024/01', 30], ['2024/02', 40], ['2024/03', 30]]);
      const actual = new Map([['2024/01', 10], ['2024/02', 20]]);

      const result = distributeForecastAcrossMonths(150, planned, actual);

      const sum = Array.from(result.values()).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(150, 5);
    });
  });

  describe('完了済みタスク（見通し = 実績）', () => {
    it('予定月と実績月がずれている完了タスクで、各月の見通しは各月の実績と一致する', () => {
      // 予定: 1月50h + 2月50h（合計100h）
      // 実績: 1月30h + 2月90h（合計120h、progress=100% で forecast=actual=120h）
      const planned = new Map([['2024/01', 50], ['2024/02', 50]]);
      const actual = new Map([['2024/01', 30], ['2024/02', 90]]);

      const result = distributeForecastAcrossMonths(120, planned, actual);

      expect(result.get('2024/01')).toBe(30);
      expect(result.get('2024/02')).toBe(90);
    });
  });

  describe('予定外の月に実績が計上されるケース', () => {
    it('予定にない月に実績がある場合、その月の見通しは実績以上になる', () => {
      // 予定: 1月のみ50h
      // 実績: 2月に30h（予定期間外で作業）
      // 総見通し 80h、総実績 30h、残見通し 50h
      // 1月: 予定50 / 実績0 => 0 + (50/50)*50 = 50
      // 2月: 予定0  / 実績30 => 30 + (0/50)*50 = 30
      const planned = new Map([['2024/01', 50]]);
      const actual = new Map([['2024/02', 30]]);

      const result = distributeForecastAcrossMonths(80, planned, actual);

      expect(result.get('2024/01')).toBe(50);
      expect(result.get('2024/02')).toBe(30);
    });

    it('各月で monthlyForecast >= monthlyActual の不変条件を満たす', () => {
      const planned = new Map([['2024/01', 20], ['2024/02', 30]]);
      const actual = new Map([['2024/01', 5], ['2024/02', 40], ['2024/03', 15]]);

      const result = distributeForecastAcrossMonths(100, planned, actual);

      for (const [month, actualHours] of actual.entries()) {
        const forecastHours = result.get(month) ?? 0;
        expect(forecastHours).toBeGreaterThanOrEqual(actualHours);
      }
    });
  });

  describe('エッジケース: totalForecast < totalActual', () => {
    it('総見通しが総実績を下回る場合、各月の見通しは実績と一致する（クランプ）', () => {
      // 総見通し 50h だが総実績 100h（progressRate=0 で forecast=planned になった等）
      // remainingForecast = max(0, 50 - 100) = 0
      // 各月: monthlyForecast = monthlyActual
      const planned = new Map([['2024/01', 50]]);
      const actual = new Map([['2024/01', 60], ['2024/02', 40]]);

      const result = distributeForecastAcrossMonths(50, planned, actual);

      expect(result.get('2024/01')).toBe(60);
      expect(result.get('2024/02')).toBe(40);
    });
  });

  describe('エッジケース: totalPlanned = 0', () => {
    it('予定ゼロかつ実績あり・残見通しありの場合、実績比率で残見通しを配分する', () => {
      // 予定なし、実績: 1月20h + 2月30h (合計50h)
      // 総見通し 100h => 残見通し 50h
      // 予定合計が 0 のため、実績比率で残見通しを配分:
      // 1月: 20 + (20/50)*50 = 20 + 20 = 40
      // 2月: 30 + (30/50)*50 = 30 + 30 = 60
      const planned = new Map<string, number>();
      const actual = new Map([['2024/01', 20], ['2024/02', 30]]);

      const result = distributeForecastAcrossMonths(100, planned, actual);

      expect(result.get('2024/01')).toBeCloseTo(40, 5);
      expect(result.get('2024/02')).toBeCloseTo(60, 5);
    });

    it('予定ゼロかつ実績ゼロの場合、結果は空 Map', () => {
      const planned = new Map<string, number>();
      const actual = new Map<string, number>();

      const result = distributeForecastAcrossMonths(100, planned, actual);

      expect(result.size).toBe(0);
    });
  });

  describe('エッジケース: totalForecast = 0', () => {
    it('総見通しが 0 の場合、実績がある月はその実績を見通しとする', () => {
      // forecast=0 だが実績は既に存在するため、実績を下回らないよう実績値を返す
      const planned = new Map([['2024/01', 50]]);
      const actual = new Map([['2024/01', 10]]);

      const result = distributeForecastAcrossMonths(0, planned, actual);

      expect(result.get('2024/01')).toBe(10);
    });

    it('総見通しが 0 で実績もない場合、各予定月は 0 を返す', () => {
      const planned = new Map([['2024/01', 50]]);
      const actual = new Map<string, number>();

      const result = distributeForecastAcrossMonths(0, planned, actual);

      expect(result.get('2024/01')).toBe(0);
    });
  });

  describe('進行中タスクで予定どおりに進んでいるケース', () => {
    it('実績が予定通りに発生し、見通しも予定と等しい場合', () => {
      // 予定: 1月50h + 2月50h
      // 実績: 1月25h（進行中）
      // 総見通し 100h => 残見通し 75h
      // 1月: 25 + (50/100)*75 = 62.5
      // 2月: 0  + (50/100)*75 = 37.5
      const planned = new Map([['2024/01', 50], ['2024/02', 50]]);
      const actual = new Map([['2024/01', 25]]);

      const result = distributeForecastAcrossMonths(100, planned, actual);

      expect(result.get('2024/01')).toBeCloseTo(62.5, 5);
      expect(result.get('2024/02')).toBeCloseTo(37.5, 5);

      const sum = Array.from(result.values()).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(100, 5);
    });
  });
});
