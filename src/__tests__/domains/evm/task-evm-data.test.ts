import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { TaskStatus} from '@prisma/client';

describe('TaskEvmData', () => {
  const createTestTask = (overrides?: Partial<{
    taskId: number;
    taskNo: string;
    taskName: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    plannedManHours: number;
    actualManHours: number;
    status: TaskStatus;
    progressRate: number;
    costPerHour: number;
    selfReportedProgress: number | null;
  }>): TaskEvmData => {
    return new TaskEvmData(
      overrides?.taskId ?? 1,
      overrides?.taskNo ?? 'T001',
      overrides?.taskName ?? 'テストタスク',
      new Date('2025-01-01'),
      new Date('2025-01-10'),
      overrides?.plannedStartDate ?? new Date('2025-01-01'),
      overrides?.plannedEndDate ?? new Date('2025-01-10'),
      overrides?.actualStartDate ?? null,
      overrides?.actualEndDate ?? null,
      overrides?.plannedManHours ?? 100,
      overrides?.actualManHours ?? 0,
      overrides?.status ?? 'NOT_STARTED',
      overrides?.progressRate ?? 0,
      overrides?.costPerHour ?? 5000,
      overrides?.selfReportedProgress ?? null,
      overrides?.progressRate ?? 0
    );
  };

  describe('基本的な出来高計算', () => {
    it('工数ベースの出来高を正しく計算する', () => {
      const task = createTestTask({
        plannedManHours: 100,
        progressRate: 50,
      });

      expect(task.earnedValue).toBe(50); // 100 * 0.5 = 50
    });

    it('金額ベースの出来高を正しく計算する', () => {
      const task = createTestTask({
        plannedManHours: 100,
        progressRate: 50,
        costPerHour: 5000,
      });

      expect(task.earnedValueCost).toBe(250000); // 100 * 5000 * 0.5 = 250000
    });
  });

  describe('進捗率測定方法による進捗率の取得', () => {
    describe('ZERO_HUNDRED法', () => {
      it('完了タスクの進捗率は100%', () => {
        const task = createTestTask({
          status: 'COMPLETED',
          progressRate: 75, // 無視される
        });

        expect(task.getProgressRate('ZERO_HUNDRED')).toBe(100);
      });

      it('進行中タスクの進捗率は0%', () => {
        const task = createTestTask({
          status: 'IN_PROGRESS',
          progressRate: 50, // 無視される
        });

        expect(task.getProgressRate('ZERO_HUNDRED')).toBe(0);
      });

      it('未着手タスクの進捗率は0%', () => {
        const task = createTestTask({
          status: 'NOT_STARTED',
        });

        expect(task.getProgressRate('ZERO_HUNDRED')).toBe(0);
      });
    });

    describe('FIFTY_FIFTY法', () => {
      it('完了タスクの進捗率は100%', () => {
        const task = createTestTask({
          status: 'COMPLETED',
        });

        expect(task.getProgressRate('FIFTY_FIFTY')).toBe(100);
      });

      it('進行中タスクの進捗率は50%', () => {
        const task = createTestTask({
          status: 'IN_PROGRESS',
          progressRate: 75, // 無視される
        });

        expect(task.getProgressRate('FIFTY_FIFTY')).toBe(50);
      });

      it('未着手タスクの進捗率は0%', () => {
        const task = createTestTask({
          status: 'NOT_STARTED',
        });

        expect(task.getProgressRate('FIFTY_FIFTY')).toBe(0);
      });
    });

    describe('SELF_REPORTED法', () => {
      it('selfReportedProgressが設定されている場合、その値を使用する', () => {
        const task = createTestTask({
          status: 'IN_PROGRESS',
          progressRate: 60,
          selfReportedProgress: 75,
        });

        expect(task.getProgressRate('SELF_REPORTED')).toBe(75);
      });

      it('selfReportedProgressがnullの場合、progressRateを使用する', () => {
        const task = createTestTask({
          status: 'IN_PROGRESS',
          progressRate: 60,
          selfReportedProgress: null,
        });

        expect(task.getProgressRate('SELF_REPORTED')).toBe(60);
      });
    });
  });

  describe('計算モードと進捗率測定方法に応じた出来高取得', () => {
    it('工数ベース + ZERO_HUNDRED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'COMPLETED',
        costPerHour: 5000,
      });

      const ev = task.getEarnedValue('hours', 'ZERO_HUNDRED');
      expect(ev).toBe(100); // 100 * 1.0 = 100
    });

    it('工数ベース + FIFTY_FIFTY法（進行中）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
      });

      const ev = task.getEarnedValue('hours', 'FIFTY_FIFTY');
      expect(ev).toBe(50); // 100 * 0.5 = 50
    });

    it('金額ベース + FIFTY_FIFTY法（進行中）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        costPerHour: 5000,
      });

      const ev = task.getEarnedValue('cost', 'FIFTY_FIFTY');
      expect(ev).toBe(250000); // 100 * 5000 * 0.5 = 250000
    });

    it('工数ベース + SELF_REPORTED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        selfReportedProgress: 75,
      });

      const ev = task.getEarnedValue('hours', 'SELF_REPORTED');
      expect(ev).toBe(75); // 100 * 0.75 = 75
    });

    it('金額ベース + SELF_REPORTED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        costPerHour: 5000,
        selfReportedProgress: 75,
      });

      const ev = task.getEarnedValue('cost', 'SELF_REPORTED');
      expect(ev).toBe(375000); // 100 * 5000 * 0.75 = 375000
    });
  });

  describe('評価日時点での計画価値取得', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-10'); // 10日間

    it('評価日が開始日より前の場合、PVは0', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate(new Date('2024-12-31'), 'hours');
      expect(pv).toBe(0);
    });

    it('評価日が終了日以降の場合、PVは計画工数全体', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate(new Date('2025-01-15'), 'hours');
      expect(pv).toBe(100);
    });

    it('評価日が期間中の場合、按分したPVを計算（工数ベース）', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      // 2025-01-05は開始から4日後（9日間の約44.4%）
      const pv = task.getPlannedValueAtDate(new Date('2025-01-05'), 'hours');
      expect(pv).toBeCloseTo(44.4, 1); // 100 * (4/9) ≈ 44.4
    });

    it('評価日が期間中の場合、按分したPVを計算（金額ベース）', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
        costPerHour: 5000,
      });

      // 2025-01-06は開始から5日後（9日間の約55.6%）
      const pv = task.getPlannedValueAtDate(new Date('2025-01-06'), 'cost');
      expect(pv).toBeCloseTo(277777, -1); // 100 * 5000 * (5/9) ≈ 277777
    });

    it('開始日と終了日が同じ場合、評価日がその日であればPVは全体を返す', () => {
      const sameDate = new Date('2025-01-01');
      const task = createTestTask({
        plannedStartDate: sameDate,
        plannedEndDate: sameDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate(sameDate, 'hours');
      expect(pv).toBe(100); // 終了日以降なので全体を返す
    });
  });

  describe('コンストラクタ', () => {
    it('すべてのプロパティが正しく設定される', () => {
      const task = new TaskEvmData(
        1,
        'T001',
        'テストタスク',
        new Date('2025-01-01'),
        new Date('2025-01-10'),
        new Date('2025-01-02'),
        new Date('2025-01-11'),
        100,
        80,
        'COMPLETED',
        100,
        5000,
        95
      );

      expect(task.taskId).toBe(1);
      expect(task.taskNo).toBe('T001');
      expect(task.taskName).toBe('テストタスク');
      expect(task.plannedManHours).toBe(100);
      expect(task.actualManHours).toBe(80);
      expect(task.status).toBe('COMPLETED');
      expect(task.progressRate).toBe(100);
      expect(task.costPerHour).toBe(5000);
      expect(task.selfReportedProgress).toBe(95);
    });

    it('デフォルト値が正しく設定される', () => {
      const task = new TaskEvmData(
        1,
        'T001',
        'テストタスク',
        new Date('2025-01-01'),
        new Date('2025-01-10'),
        null,
        null,
        100,
        0,
        'NOT_STARTED',
        0
      );

      expect(task.costPerHour).toBe(5000); // デフォルト値
      expect(task.selfReportedProgress).toBe(null); // デフォルト値
    });
  });
});
