import { TaskEvmData } from '@/domains/evm/task-evm-data';
import { TaskStatus } from '@/types/wbs';

describe('TaskEvmData', () => {
  const createTestTask = (overrides?: Partial<{
    taskId: number;
    taskNo: string;
    taskName: string;
    baseStartDate: Date;
    baseEndDate: Date;
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    baseManHours: number;
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
      overrides?.baseStartDate ?? new Date('2025-01-01'),
      overrides?.baseEndDate ?? new Date('2025-01-10'),
      overrides?.plannedStartDate ?? new Date('2025-01-01'),
      overrides?.plannedEndDate ?? new Date('2025-01-10'),
      overrides?.actualStartDate ?? null,
      overrides?.actualEndDate ?? null,
      overrides?.baseManHours ?? 100,
      overrides?.plannedManHours ?? 100,
      overrides?.actualManHours ?? 0,
      overrides?.status ?? 'NOT_STARTED',
      overrides?.progressRate ?? 0,
      overrides?.costPerHour ?? 5000,
      overrides?.selfReportedProgress ?? null
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
    const evaluationDate = new Date('2025-01-15'); // 終了日以降

    it('工数ベース + ZERO_HUNDRED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'COMPLETED',
        costPerHour: 5000,
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'hours', 'ZERO_HUNDRED');
      expect(ev).toBe(100); // 100 * 1.0 = 100
    });

    it('工数ベース + FIFTY_FIFTY法（進行中）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'hours', 'FIFTY_FIFTY');
      expect(ev).toBe(50); // 100 * 0.5 = 50
    });

    it('金額ベース + FIFTY_FIFTY法（進行中）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        costPerHour: 5000,
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'cost', 'FIFTY_FIFTY');
      expect(ev).toBe(250000); // 100 * 5000 * 0.5 = 250000
    });

    it('工数ベース + SELF_REPORTED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        selfReportedProgress: 75,
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'hours', 'SELF_REPORTED');
      expect(ev).toBe(75); // 100 * 0.75 = 75
    });

    it('金額ベース + SELF_REPORTED法', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        costPerHour: 5000,
        selfReportedProgress: 75,
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'cost', 'SELF_REPORTED');
      expect(ev).toBe(375000); // 100 * 5000 * 0.75 = 375000
    });

    it('actualStartDateがnullの場合、出来高は0', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'COMPLETED',
        actualStartDate: null,
      });

      const ev = task.getEarnedValue(evaluationDate, 'hours', 'ZERO_HUNDRED');
      expect(ev).toBe(0);
    });

    it('評価日がactualStartDate前の場合、出来高は0', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        actualStartDate: new Date('2025-01-20'),
      });

      const ev = task.getEarnedValue(evaluationDate, 'hours', 'FIFTY_FIFTY');
      expect(ev).toBe(0);
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

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2024-12-31'), 'hours');
      expect(pv).toBe(0);
    });

    it('評価日が終了日以降の場合、PVは計画工数全体', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-15'), 'hours');
      expect(pv).toBe(100);
    });

    it('評価日が期間中の場合、按分したPVを計算（工数ベース）', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      // 2025-01-05は開始から4日後（9日間の約44.4%）
      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-05'), 'hours', 'LINEAR');
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
      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-06'), 'cost', 'LINEAR');
      expect(pv).toBeCloseTo(277777, -1); // 100 * 5000 * (5/9) ≈ 277777
    });

    it('開始日と終了日が同じ場合、評価日がその日であればPVは全体を返す', () => {
      const sameDate = new Date('2025-01-01');
      const task = createTestTask({
        plannedStartDate: sameDate,
        plannedEndDate: sameDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', sameDate, 'hours');
      expect(pv).toBe(100); // 終了日以降なので全体を返す
    });

    it('BASEタイプでbaseStartDate/baseEndDateを使用する', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 200,
        plannedStartDate: new Date('2025-01-05'),
        plannedEndDate: new Date('2025-01-15'),
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-15'), 'hours');
      expect(pv).toBe(200); // baseManHoursを使用
    });
  });

  describe('getPlannedValueAtDate - 進捗率測定方法による分岐', () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-10'); // 9日間

    it('ZERO_HUNDRED法: 期間中の場合PVは0', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-05'), 'hours', 'ZERO_HUNDRED');
      expect(pv).toBe(0);
    });

    it('ZERO_HUNDRED法: 終了日以降はPV全体を返す', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-15'), 'hours', 'ZERO_HUNDRED');
      expect(pv).toBe(100);
    });

    it('FIFTY_FIFTY法: 期間中の場合PVは50%', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-05'), 'hours', 'FIFTY_FIFTY');
      expect(pv).toBe(50);
    });

    it('FIFTY_FIFTY法: 金額ベースで期間中PVは50%', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
        costPerHour: 5000,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-05'), 'cost', 'FIFTY_FIFTY');
      expect(pv).toBe(250000); // 100 * 5000 * 0.5
    });

    it('SELF_REPORTED法: LINEARとして扱う（按分計算）', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-05'), 'hours', 'SELF_REPORTED');
      // SELF_REPORTEDはLINEARと同じ計算: 100 * (4/9) ≈ 44.4
      expect(pv).toBeCloseTo(44.4, 1);
    });

    it('LINEAR法: 開始日と同じ日はPV=0（経過0日）', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('YOTEI', startDate, 'hours', 'LINEAR');
      expect(pv).toBe(0); // getDaysBetween(start, start) = 0
    });

    it('LINEAR法: 開始日翌日は1日分', () => {
      const task = createTestTask({
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        plannedManHours: 90, // 9日間で90h = 1日10h
      });

      const pv = task.getPlannedValueAtDate('YOTEI', new Date('2025-01-02'), 'hours', 'LINEAR');
      // 90 * (1/9) = 10
      expect(pv).toBeCloseTo(10, 1);
    });
  });

  describe('getPlannedValueAtDate - BASEタイプの詳細', () => {
    it('BASEタイプはbaseManHoursを使用する', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-20'),
        baseManHours: 200,
        plannedStartDate: new Date('2025-01-05'),
        plannedEndDate: new Date('2025-01-15'),
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-25'), 'hours');
      expect(pv).toBe(200);
    });

    it('BASEタイプで期間中のLINEAR按分', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-11'), // 10日間
        baseManHours: 100,
        plannedStartDate: new Date('2025-01-05'),
        plannedEndDate: new Date('2025-01-15'),
        plannedManHours: 80,
      });

      // BASE: 100 * (5/10) = 50
      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-06'), 'hours', 'LINEAR');
      expect(pv).toBeCloseTo(50, 1);
    });

    it('BASEタイプで金額ベース', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 100,
        costPerHour: 3000,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-15'), 'cost');
      expect(pv).toBe(300000); // 100 * 3000
    });

    it('BASEタイプ + ZERO_HUNDRED: 期間中はPV=0', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 200,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-05'), 'hours', 'ZERO_HUNDRED');
      expect(pv).toBe(0);
    });

    it('BASEタイプ + ZERO_HUNDRED: 終了日以降はbaseManHours全体', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 200,
        plannedManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-15'), 'hours', 'ZERO_HUNDRED');
      expect(pv).toBe(200);
    });

    it('BASEタイプ + FIFTY_FIFTY: 期間中はbaseManHoursの50%', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 200,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-05'), 'hours', 'FIFTY_FIFTY');
      expect(pv).toBe(100);
    });

    it('BASEタイプ + FIFTY_FIFTY: 金額ベースで期間中は50%', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-10'),
        baseManHours: 200,
        costPerHour: 3000,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-05'), 'cost', 'FIFTY_FIFTY');
      expect(pv).toBe(300000);
    });

    it('BASEタイプ + SELF_REPORTED: LINEARとして按分', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-01-01'),
        baseEndDate: new Date('2025-01-11'),
        baseManHours: 100,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-06'), 'hours', 'SELF_REPORTED');
      expect(pv).toBeCloseTo(50, 1);
    });

    it('BASEタイプ: 評価日がbaseStartDateより前はPV=0', () => {
      const task = createTestTask({
        baseStartDate: new Date('2025-02-01'),
        baseEndDate: new Date('2025-02-10'),
        baseManHours: 100,
        plannedStartDate: new Date('2025-01-01'),
        plannedEndDate: new Date('2025-01-10'),
        plannedManHours: 50,
      });

      const pv = task.getPlannedValueAtDate('BASE', new Date('2025-01-15'), 'hours');
      expect(pv).toBe(0);
    });
  });

  describe('getEarnedValue - 境界値テスト', () => {
    it('評価日がactualStartDateと同日の場合、出来高を計算する', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        progressRate: 30,
        actualStartDate: new Date('2025-01-05'),
      });

      const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'SELF_REPORTED');
      expect(ev).toBe(30); // 100 * (30/100)
    });

    it('進捗率0でもactualStartDate以降なら0を返す（ゼロ除算なし）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'NOT_STARTED',
        progressRate: 0,
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'SELF_REPORTED');
      expect(ev).toBe(0);
    });

    it('plannedManHoursが0の場合、出来高は常に0', () => {
      const task = createTestTask({
        plannedManHours: 0,
        status: 'COMPLETED',
        actualStartDate: new Date('2025-01-01'),
      });

      const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'ZERO_HUNDRED');
      expect(ev).toBe(0); // 0 * (100/100) = 0
    });
  });

  describe('getEarnedValue - 時系列の位相（提案C: 完了日計上＋実績期間按分）', () => {
    describe('ZERO_HUNDRED: 完了日に0→100へステップ', () => {
      it('完了日前のEVは0', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-10'),
        });

        // 完了日(1/10)より前の評価日 → 0
        const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'ZERO_HUNDRED');
        expect(ev).toBe(0);
      });

      it('完了日以降のEVは全体', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-10'),
        });

        const ev = task.getEarnedValue(new Date('2025-01-10'), 'hours', 'ZERO_HUNDRED');
        expect(ev).toBe(100);
      });
    });

    describe('FIFTY_FIFTY: 実績開始で50、完了日で100', () => {
      it('完了タスクは開始〜完了日の間は50%', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-10'),
        });

        const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'FIFTY_FIFTY');
        expect(ev).toBe(50);
      });

      it('完了タスクは完了日以降100%', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-10'),
        });

        const ev = task.getEarnedValue(new Date('2025-01-15'), 'hours', 'FIFTY_FIFTY');
        expect(ev).toBe(100);
      });

      it('進行中タスクは開始以降50%で一定', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          actualStartDate: new Date('2025-01-01'),
        });

        const ev = task.getEarnedValue(new Date('2025-01-05'), 'hours', 'FIFTY_FIFTY');
        expect(ev).toBe(50);
      });
    });

    describe('SELF_REPORTED: 実績開始→基準日まで線形按分', () => {
      it('進行中タスクは実績開始〜基準日の中間で按分される', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 80,
          selfReportedProgress: 80,
          actualStartDate: new Date('2025-01-01'),
        });

        // 基準日(now)=1/11（実績10日間）、評価日=1/06（経過5日 → 半分）
        const ev = task.getEarnedValue(
          new Date('2025-01-06'),
          'hours',
          'SELF_REPORTED',
          new Date('2025-01-11')
        );
        // final=80 を 5/10 で按分 → 40
        expect(ev).toBeCloseTo(40, 5);
      });

      it('基準日(現在時点)では現在進捗率そのもの（=従来値を維持）', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'IN_PROGRESS',
          progressRate: 80,
          selfReportedProgress: 80,
          actualStartDate: new Date('2025-01-01'),
        });

        const referenceDate = new Date('2025-01-11');
        const ev = task.getEarnedValue(referenceDate, 'hours', 'SELF_REPORTED', referenceDate);
        expect(ev).toBe(80);
      });

      it('完了タスクは実績開始→完了日で100%まで按分', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          progressRate: 100,
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-11'),
        });

        // 完了日(1/11)以降は100、途中(1/06, 5/10)は50に按分
        const evMid = task.getEarnedValue(new Date('2025-01-06'), 'hours', 'SELF_REPORTED');
        expect(evMid).toBeCloseTo(50, 5);

        const evEnd = task.getEarnedValue(new Date('2025-01-15'), 'hours', 'SELF_REPORTED');
        expect(evEnd).toBe(100);
      });

      it('完了タスクはprogressRateが100未満でも100%として扱う', () => {
        const task = createTestTask({
          plannedManHours: 100,
          status: 'COMPLETED',
          progressRate: 80, // 古い申告値だが完了済み
          selfReportedProgress: 80,
          actualStartDate: new Date('2025-01-01'),
          actualEndDate: new Date('2025-01-10'),
        });

        const ev = task.getEarnedValue(new Date('2025-01-15'), 'hours', 'SELF_REPORTED');
        expect(ev).toBe(100);
      });
    });
  });

  describe('getEarnedValueDirect（按分しない直接EV・2B）', () => {
    it('SELF_REPORTED：進捗率を直接適用（按分なし）', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'IN_PROGRESS',
        progressRate: 40,
        selfReportedProgress: 40,
      });
      expect(task.getEarnedValueDirect('hours', 'SELF_REPORTED')).toBe(40);
    });

    it('SELF_REPORTED：COMPLETEDは100%強制', () => {
      const task = createTestTask({
        plannedManHours: 100,
        status: 'COMPLETED',
        progressRate: 40,
        selfReportedProgress: 40,
      });
      expect(task.getEarnedValueDirect('hours', 'SELF_REPORTED')).toBe(100);
    });

    it('ZERO_HUNDRED：未完了0%・完了100%', () => {
      expect(
        createTestTask({ status: 'IN_PROGRESS', plannedManHours: 100 }).getEarnedValueDirect('hours', 'ZERO_HUNDRED'),
      ).toBe(0);
      expect(
        createTestTask({ status: 'COMPLETED', plannedManHours: 100 }).getEarnedValueDirect('hours', 'ZERO_HUNDRED'),
      ).toBe(100);
    });

    it('FIFTY_FIFTY：着手中50%・完了100%', () => {
      expect(
        createTestTask({ status: 'IN_PROGRESS', plannedManHours: 100 }).getEarnedValueDirect('hours', 'FIFTY_FIFTY'),
      ).toBe(50);
      expect(
        createTestTask({ status: 'COMPLETED', plannedManHours: 100 }).getEarnedValueDirect('hours', 'FIFTY_FIFTY'),
      ).toBe(100);
    });

    it('costモード：単価込みで計算', () => {
      const task = createTestTask({
        plannedManHours: 10,
        costPerHour: 5000,
        status: 'IN_PROGRESS',
        progressRate: 50,
        selfReportedProgress: 50,
      });
      // 10h * 5000 * 50% = 25000
      expect(task.getEarnedValueDirect('cost', 'SELF_REPORTED')).toBe(25000);
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
        new Date('2025-01-01'),
        new Date('2025-01-10'),
        new Date('2025-01-02'),
        new Date('2025-01-11'),
        100,
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
      expect(task.baseManHours).toBe(100);
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
        new Date('2025-01-01'),
        new Date('2025-01-10'),
        null,
        null,
        100,
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
