/**
 * ForecastCalculationService ユニットテスト
 *
 * 仕様書: docs/specs/03-forecast-calculation.md セクション4〜6
 */

import { ForecastCalculationService } from '@/domains/forecast/forecast-calculation-service';
import { ForecastTaskInput } from '@/domains/forecast/forecast-task-input';

// テスト用ForecastTaskInputファクトリ
function createTask(overrides: Partial<ForecastTaskInput> = {}): ForecastTaskInput {
  return {
    id: 'task-1',
    name: 'テストタスク',
    yoteiKosu: 100,
    jissekiKosu: 0,
    progressRate: 0,
    status: 'NOT_STARTED',
    ...overrides,
  };
}

describe('ForecastCalculationService', () => {
  describe('calculateForecastHours - 共通境界条件', () => {
    it('progressRate >= 100 の場合、全方式で actualHours を返す', () => {
      const methods = ['conservative', 'realistic', 'optimistic'] as const;

      for (const method of methods) {
        const task = createTask({
          yoteiKosu: 100,
          jissekiKosu: 120,
          progressRate: 100,
          status: 'COMPLETED',
        });
        const result = ForecastCalculationService.calculateTaskForecast(task, {
          method,
          progressMeasurementMethod: 'SELF_REPORTED',
        });
        expect(result.forecastHours).toBe(120);
      }
    });

    it('progressRate <= 0 の場合、conservative/realistic/optimistic は plannedHours を返す', () => {
      const methods = ['conservative', 'realistic', 'optimistic'] as const;

      for (const method of methods) {
        const task = createTask({
          yoteiKosu: 100,
          jissekiKosu: 30,
          progressRate: 0,
          status: 'NOT_STARTED',
        });
        const result = ForecastCalculationService.calculateTaskForecast(task, {
          method,
          progressMeasurementMethod: 'SELF_REPORTED',
        });
        expect(result.forecastHours).toBe(100);
      }
    });
  });

  describe('calculateForecastHours - conservative（保守的）', () => {
    it('仕様書の計算例: planned=100, actual=30, progress=25% → 120h', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // (30 / 25) * 100 = 120
      expect(result.forecastHours).toBe(120);
    });

    it('実績が予定通りの場合、見通しは予定工数と一致する', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 50,
        progressRate: 50,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // (50 / 50) * 100 = 100
      expect(result.forecastHours).toBe(100);
    });

    it('実績が予定より少ない場合、見通しは予定を下回る', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 20,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // (20 / 25) * 100 = 80
      expect(result.forecastHours).toBe(80);
    });
  });

  describe('calculateForecastHours - optimistic（楽観的）', () => {
    it('仕様書の計算例: planned=100, actual=30, progress=25% → 105h', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'optimistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // remainingWork = 0.75, 30 + 100 * 0.75 = 105
      expect(result.forecastHours).toBe(105);
    });

    it('実績が予定通りの場合、見通しは予定工数と一致する', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 50,
        progressRate: 50,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'optimistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // 50 + 100 * 0.5 = 100
      expect(result.forecastHours).toBe(100);
    });
  });

  describe('calculateForecastHours - realistic（現実的）', () => {
    it('仕様書の計算例(25%): planned=100, actual=30, progress=25% → 108.75h', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // estimatedFromActual = (30/25)*100 = 120
      // remainingPlanned = 100 * 0.75 = 75
      // actualWeight = 0.25, plannedWeight = 0.75
      // 120 * 0.25 + (30 + 75) * 0.75 = 30 + 78.75 = 108.75
      expect(result.forecastHours).toBeCloseTo(108.75, 5);
    });

    it('仕様書の計算例(80%): planned=100, actual=80, progress=80% → 100h', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 80,
        progressRate: 80,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // estimatedFromActual = (80/80)*100 = 100
      // remainingPlanned = 100 * 0.20 = 20
      // actualWeight = 0.80, plannedWeight = 0.20
      // 100 * 0.80 + (80 + 20) * 0.20 = 80 + 20 = 100
      expect(result.forecastHours).toBeCloseTo(100, 5);
    });

    it('実績が予定通りの場合、見通しは予定工数と一致する', () => {
      // actualHours = plannedHours * progressRate / 100 のとき
      // conservative = optimistic = plannedHours なので realistic も plannedHours
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 50,
        progressRate: 50,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBeCloseTo(100, 5);
    });

    it('進捗率が高いほど conservative に近づく', () => {
      // progress=75%、actual=90h（予定より遅い）
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 90,
        progressRate: 75,
        status: 'IN_PROGRESS',
      });
      const realistic = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      const conservative = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      const optimistic = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'optimistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });

      // realistic は conservative と optimistic の間に位置する
      const minVal = Math.min(conservative.forecastHours, optimistic.forecastHours);
      const maxVal = Math.max(conservative.forecastHours, optimistic.forecastHours);
      expect(realistic.forecastHours).toBeGreaterThanOrEqual(minVal);
      expect(realistic.forecastHours).toBeLessThanOrEqual(maxVal);
    });
  });

  describe('calculateForecastHours - plannedOrActual（予定/実績優先）', () => {
    it('actualHours <= 0 の場合、plannedHours を返す', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 0,
        progressRate: 0,
        status: 'NOT_STARTED',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(100);
    });

    it('plannedHours <= 0 の場合、actualHours を返す', () => {
      const task = createTask({
        yoteiKosu: 0,
        jissekiKosu: 50,
        progressRate: 50,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(50);
    });

    it('両方正の値で actual >= planned の場合、actualHours を返す', () => {
      const task = createTask({
        yoteiKosu: 80,
        jissekiKosu: 120,
        progressRate: 50,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(120);
    });

    it('両方正の値で actual < planned の場合、plannedHours を返す', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 30,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(100);
    });

    it('progressRate >= 100 の場合でも、完了時は actualHours を返す（共通境界条件）', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 80,
        progressRate: 100,
        status: 'COMPLETED',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(80);
    });

    it('plannedOrActual は progressRate <= 0 の共通境界条件より先に評価される', () => {
      // progressRate=0 だが actualHours > 0 の場合、
      // plannedOrActual は独自のロジックで max(actual, planned) を返す
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 150,
        progressRate: 0,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // actualHours(150) > plannedHours(100) → 150
      // 他の方式なら progressRate<=0 で plannedHours=100 を返す
      expect(result.forecastHours).toBe(150);
    });

    it('plannedHours=0 かつ actualHours=0 の場合、0 を返す', () => {
      const task = createTask({
        yoteiKosu: 0,
        jissekiKosu: 0,
        progressRate: 0,
        status: 'NOT_STARTED',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'plannedOrActual',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      // actualHours <= 0 → plannedHours = 0
      expect(result.forecastHours).toBe(0);
    });
  });

  describe('calculateTaskForecast - 進捗測定方式との統合', () => {
    it('ZERO_HUNDRED: IN_PROGRESS は effectiveProgress=0% → plannedHours を返す', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 60,
        progressRate: 60,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'ZERO_HUNDRED',
      });
      // ZERO_HUNDRED: IN_PROGRESS → effectiveProgress=0 → plannedHours=100
      expect(result.effectiveProgressRate).toBe(0);
      expect(result.forecastHours).toBe(100);
    });

    it('FIFTY_FIFTY: IN_PROGRESS は effectiveProgress=50%', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 75,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'FIFTY_FIFTY',
      });
      // FIFTY_FIFTY: IN_PROGRESS → effectiveProgress=50
      // conservative: (30 / 50) * 100 = 60
      expect(result.effectiveProgressRate).toBe(50);
      expect(result.forecastHours).toBe(60);
    });

    it('SELF_REPORTED: 申告値がそのまま使用される', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.effectiveProgressRate).toBe(25);
      expect(result.forecastHours).toBe(120);
    });
  });

  describe('calculateTaskForecast - 返り値の構造', () => {
    it('ForecastCalculationResult の全フィールドが正しく設定される', () => {
      const task = createTask({
        id: 'task-42',
        name: '設計作業',
        yoteiKosu: 100,
        jissekiKosu: 30,
        progressRate: 25,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });

      expect(result.taskId).toBe('task-42');
      expect(result.taskName).toBe('設計作業');
      expect(result.plannedHours).toBe(100);
      expect(result.actualHours).toBe(30);
      expect(result.progressRate).toBe(25);
      expect(result.effectiveProgressRate).toBe(25);
      expect(result.forecastHours).toBe(120);
      expect(result.completionStatus).toBe('IN_PROGRESS');
    });

    it('yoteiKosu/jissekiKosu が null の場合は 0 として扱う', () => {
      const task = createTask({
        yoteiKosu: null,
        jissekiKosu: null,
        progressRate: null,
        status: 'NOT_STARTED',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.plannedHours).toBe(0);
      expect(result.actualHours).toBe(0);
      expect(result.forecastHours).toBe(0);
    });
  });

  describe('calculateMultipleTasksForecast', () => {
    it('複数タスクを一括計算できる', () => {
      const tasks = [
        createTask({ id: 'task-1', yoteiKosu: 100, jissekiKosu: 120, progressRate: 100, status: 'COMPLETED' }),
        createTask({ id: 'task-2', yoteiKosu: 80, jissekiKosu: 20, progressRate: 25, status: 'IN_PROGRESS' }),
        createTask({ id: 'task-3', yoteiKosu: 60, jissekiKosu: 0, progressRate: 0, status: 'NOT_STARTED' }),
      ];

      const results = ForecastCalculationService.calculateMultipleTasksForecast(tasks, {
        method: 'conservative',
        progressMeasurementMethod: 'SELF_REPORTED',
      });

      expect(results).toHaveLength(3);
      expect(results[0].forecastHours).toBe(120);  // 完了: actualHours
      expect(results[1].forecastHours).toBe(80);    // (20/25)*100 = 80
      expect(results[2].forecastHours).toBe(60);    // progressRate=0 → plannedHours
    });

    it('デフォルトオプション（realistic + SELF_REPORTED）で動作する', () => {
      const tasks = [
        createTask({ yoteiKosu: 100, jissekiKosu: 50, progressRate: 50, status: 'IN_PROGRESS' }),
      ];

      const results = ForecastCalculationService.calculateMultipleTasksForecast(tasks);

      expect(results).toHaveLength(1);
      // realistic: actual=50, progress=50 → estimatedFromActual=100, remaining=50
      // 100*0.5 + (50+50)*0.5 = 50 + 50 = 100
      expect(results[0].forecastHours).toBeCloseTo(100, 5);
    });
  });

  describe('定常タスク（isSteady）は進捗率ベースではなく定常方式で算出する', () => {
    it('isSteady=true の場合、進捗率に依らず定常方式（PLANNED既定）で算出する', () => {
      // 進捗率0・実績超過でも、通常方式なら plannedHours=100 になるが、
      // 定常PLANNEDは max(予定, 実績)=130 を返す
      const task = createTask({
        name: 'プロジェクト管理',
        yoteiKosu: 100,
        jissekiKosu: 130,
        progressRate: 0,
        status: 'IN_PROGRESS',
        isSteady: true,
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        progressMeasurementMethod: 'SELF_REPORTED',
      });
      expect(result.forecastHours).toBe(130);
      expect(result.isSteady).toBe(true);
    });

    it('ACTUAL_PACE は稼働日数から実績ペースを投影し、日次ペースも返す', () => {
      const task = createTask({
        name: 'プロジェクト管理',
        yoteiKosu: 100,
        jissekiKosu: 48,
        progressRate: 0,
        status: 'IN_PROGRESS',
        isSteady: true,
        steadyWorkingDays: { total: 20, elapsed: 8 },
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        steadyTaskForecastMode: 'ACTUAL_PACE',
      });
      // (48/8)*20 = 120h, 日次ペース 6h/日
      expect(result.forecastHours).toBeCloseTo(120, 5);
      expect(result.steadyDailyRate).toBeCloseTo(6, 5);
    });

    it('稼働日数が無い場合は PLANNED 相当にフォールバックする', () => {
      const task = createTask({
        name: 'プロジェクト管理',
        yoteiKosu: 100,
        jissekiKosu: 48,
        progressRate: 0,
        status: 'IN_PROGRESS',
        isSteady: true,
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        steadyTaskForecastMode: 'ACTUAL_PACE',
      });
      expect(result.forecastHours).toBe(100); // max(100, 48)
    });

    it('isSteady 未指定のタスクは従来どおり進捗率ベースで算出する', () => {
      const task = createTask({
        yoteiKosu: 100,
        jissekiKosu: 48,
        progressRate: 0,
        status: 'IN_PROGRESS',
      });
      const result = ForecastCalculationService.calculateTaskForecast(task, {
        method: 'realistic',
        steadyTaskForecastMode: 'ACTUAL_PACE',
      });
      // progressRate<=0 → plannedHours=100（定常方式は適用されない）
      expect(result.forecastHours).toBe(100);
      expect(result.isSteady).toBeUndefined();
    });
  });
});
