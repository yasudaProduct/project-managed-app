/**
 * TaskProgressCalculator ユニットテスト
 */

import { TaskProgressCalculator, TaskStatus } from '@/domains/task/task-progress-calculator';
import { ProgressMeasurementMethod } from '@/types/progress-measurement';

describe('TaskProgressCalculator', () => {
  describe('calculateEffectiveProgress', () => {
    describe('0/100法（ZERO_HUNDRED）', () => {
      it('完了タスクは100%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'COMPLETED',
          50, // 自己申告が50%でも
          'ZERO_HUNDRED'
        );
        expect(result).toBe(100);
      });

      it('進行中タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          75, // 自己申告が75%でも
          'ZERO_HUNDRED'
        );
        expect(result).toBe(0);
      });

      it('未着手タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'NOT_STARTED',
          null,
          'ZERO_HUNDRED'
        );
        expect(result).toBe(0);
      });

      it('保留タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'ON_HOLD',
          30,
          'ZERO_HUNDRED'
        );
        expect(result).toBe(0);
      });
    });

    describe('50/50法（FIFTY_FIFTY）', () => {
      it('完了タスクは100%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'COMPLETED',
          50,
          'FIFTY_FIFTY'
        );
        expect(result).toBe(100);
      });

      it('進行中タスクは50%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          75, // 自己申告が75%でも
          'FIFTY_FIFTY'
        );
        expect(result).toBe(50);
      });

      it('未着手タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'NOT_STARTED',
          null,
          'FIFTY_FIFTY'
        );
        expect(result).toBe(0);
      });

      it('保留タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'ON_HOLD',
          30,
          'FIFTY_FIFTY'
        );
        expect(result).toBe(0);
      });
    });

    describe('自己申告進捗率（SELF_REPORTED）', () => {
      it('完了タスクは自己申告値に関わらず100%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'COMPLETED',
          50, // 自己申告が50%でも
          'SELF_REPORTED'
        );
        expect(result).toBe(100);
      });

      it('進行中タスクは自己申告値を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          75,
          'SELF_REPORTED'
        );
        expect(result).toBe(75);
      });

      it('進行中タスクで自己申告値がnullの場合は50%を返す（フォールバック）', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          null,
          'SELF_REPORTED'
        );
        expect(result).toBe(50);
      });

      it('未着手タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'NOT_STARTED',
          null,
          'SELF_REPORTED'
        );
        expect(result).toBe(0);
      });

      it('保留タスクは0%を返す', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'ON_HOLD',
          null,
          'SELF_REPORTED'
        );
        expect(result).toBe(0);
      });

      it('自己申告値が0未満の場合は0にクランプする', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          -10,
          'SELF_REPORTED'
        );
        expect(result).toBe(0);
      });

      it('自己申告値が100超の場合は100にクランプする', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          150,
          'SELF_REPORTED'
        );
        expect(result).toBe(100);
      });

      it('自己申告値が0の場合は0を返す（nullとは異なる）', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          0,
          'SELF_REPORTED'
        );
        expect(result).toBe(0);
      });
    });

    describe('デフォルト動作', () => {
      it('不明な測定方式の場合はSELF_REPORTEDとして扱う', () => {
        const result = TaskProgressCalculator.calculateEffectiveProgress(
          'IN_PROGRESS',
          60,
          'UNKNOWN_METHOD' as ProgressMeasurementMethod
        );
        expect(result).toBe(60); // SELF_REPORTEDと同じ
      });
    });
  });

  describe('calculateWeightedAverageProgress', () => {
    it('空配列の場合は0を返す', () => {
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        [],
        'SELF_REPORTED'
      );
      expect(result).toBe(0);
    });

    it('単一タスクの場合はそのタスクの進捗率を返す', () => {
      const tasks = [
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 75,
          plannedHours: 10,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'SELF_REPORTED'
      );
      expect(result).toBe(75);
    });

    it('複数タスクの加重平均を正しく計算する（SELF_REPORTED）', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 100,
          plannedHours: 10,
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 50,
          plannedHours: 20,
        },
        {
          status: 'NOT_STARTED' as TaskStatus,
          selfReportedProgress: 0,
          plannedHours: 30,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'SELF_REPORTED'
      );
      // (100*10 + 50*20 + 0*30) / (10+20+30) = 2000/60 = 33.33
      expect(result).toBeCloseTo(33.33, 2);
    });

    it('複数タスクの加重平均を正しく計算する（FIFTY_FIFTY）', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 80, // 自己申告は無視される
          plannedHours: 10,
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 30, // 自己申告は無視される
          plannedHours: 20,
        },
        {
          status: 'NOT_STARTED' as TaskStatus,
          selfReportedProgress: 0,
          plannedHours: 30,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'FIFTY_FIFTY'
      );
      // (100*10 + 50*20 + 0*30) / (10+20+30) = 2000/60 = 33.33
      expect(result).toBeCloseTo(33.33, 2);
    });

    it('複数タスクの加重平均を正しく計算する（ZERO_HUNDRED）', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 80,
          plannedHours: 10,
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 50, // 0/100法では無視される
          plannedHours: 20,
        },
        {
          status: 'NOT_STARTED' as TaskStatus,
          selfReportedProgress: 0,
          plannedHours: 30,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'ZERO_HUNDRED'
      );
      // (100*10 + 0*20 + 0*30) / (10+20+30) = 1000/60 = 16.67
      expect(result).toBeCloseTo(16.67, 2);
    });

    it('予定工数が0のタスクがある場合も正しく計算する', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 100,
          plannedHours: 0, // 予定工数0
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 50,
          plannedHours: 20,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'SELF_REPORTED'
      );
      // (100*0 + 50*20) / (0+20) = 1000/20 = 50
      expect(result).toBe(50);
    });

    it('全タスクの予定工数が0の場合は0を返す', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 100,
          plannedHours: 0,
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 50,
          plannedHours: 0,
        },
      ];
      const result = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'SELF_REPORTED'
      );
      expect(result).toBe(0);
    });
  });

  describe('統合シナリオ', () => {
    it('プロジェクト全体の進捗率を3つの方式で計算できる', () => {
      const tasks = [
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 100,
          plannedHours: 20,
        },
        {
          status: 'COMPLETED' as TaskStatus,
          selfReportedProgress: 100,
          plannedHours: 30,
        },
        {
          status: 'IN_PROGRESS' as TaskStatus,
          selfReportedProgress: 60,
          plannedHours: 40,
        },
        {
          status: 'NOT_STARTED' as TaskStatus,
          selfReportedProgress: 0,
          plannedHours: 10,
        },
      ];

      const selfReported = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'SELF_REPORTED'
      );
      const fiftyFifty = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'FIFTY_FIFTY'
      );
      const zeroHundred = TaskProgressCalculator.calculateWeightedAverageProgress(
        tasks,
        'ZERO_HUNDRED'
      );

      // SELF_REPORTED: (100*20 + 100*30 + 60*40 + 0*10) / 100 = 74
      expect(selfReported).toBe(74);

      // FIFTY_FIFTY: (100*20 + 100*30 + 50*40 + 0*10) / 100 = 70
      expect(fiftyFifty).toBe(70);

      // ZERO_HUNDRED: (100*20 + 100*30 + 0*40 + 0*10) / 100 = 50
      expect(zeroHundred).toBe(50);

      // 進捗率の大小関係を検証
      expect(selfReported).toBeGreaterThan(fiftyFifty);
      expect(fiftyFifty).toBeGreaterThan(zeroHundred);
    });
  });
});
