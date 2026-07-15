import { toWorkloadData } from '@/applications/assignee-gantt/workload-data-mapper';
import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';

const MON = new Date(2024, 0, 15);

const alloc = (args: { taskId: string; hours: number; projectName?: string }) =>
  TaskAllocation.create({
    taskId: args.taskId,
    taskName: `タスク${args.taskId}`,
    allocatedHours: args.hours,
    totalHours: args.hours,
    projectName: args.projectName,
  });

const workload = (args: {
  rate?: number;
  availableHours: number;
  allocations: TaskAllocation[];
}) =>
  AssigneeWorkload.create({
    assigneeId: 'user-1',
    assigneeName: '山田太郎',
    assigneeRate: args.rate ?? 1,
    dailyAllocations: [
      DailyWorkAllocation.create({
        date: MON,
        availableHours: args.availableHours,
        taskAllocations: args.allocations,
      }),
    ],
  });

describe('toWorkloadData', () => {
  describe('既定(rateBasisなし)', () => {
    it('レート系フィールドは availableHours×assigneeRate 基準(従来仕様)', () => {
      const data = toWorkloadData(
        workload({
          rate: 0.5,
          availableHours: 3.75,
          allocations: [alloc({ taskId: '1', hours: 2 })],
        })
      );

      const daily = data.dailyAllocations[0];
      expect(daily.rateAllowedHours).toBeCloseTo(1.875, 5); // 3.75 × 0.5(従来の二重適用)
      expect(daily.isOverRateCapacity).toBe(true); // 2 > 1.875
      expect(daily.overRateHours).toBeCloseTo(0.125, 5);
      expect(daily.isOverloaded).toBe(false); // 2 ≤ 3.75
    });
  });

  describe('rateBasis指定(合算行のハイブリッド判定)', () => {
    it('R判定は現WBS分(ラベルなし配分)>標準×参画率、過負荷判定は合計vs稼働可能時間のまま', () => {
      const data = toWorkloadData(
        workload({
          rate: 1, // 合算行
          availableHours: 7.5, // 標準−個人予定
          allocations: [
            alloc({ taskId: '1', hours: 4 }), // 現WBS分(ラベルなし)
            alloc({ taskId: '2', hours: 2, projectName: '他PJ' }), // 外部分
          ],
        }),
        { rateBasis: { rate: 0.5, standardWorkingHours: 7.5 } }
      );

      const daily = data.dailyAllocations[0];
      // 取り分 = 7.5 × 0.5 = 3.75。現WBS分4h > 3.75 → R
      expect(daily.rateAllowedHours).toBeCloseTo(3.75, 5);
      expect(daily.isOverRateCapacity).toBe(true);
      expect(daily.overRateHours).toBeCloseTo(0.25, 5);
      // 過負荷は合計6h vs 7.5h → 適正のまま
      expect(daily.isOverloaded).toBe(false);
      expect(daily.utilizationRate).toBeCloseTo(0.8, 5);
    });

    it('現WBS分が取り分内なら外部負荷が多くてもRは点かない(過負荷判定は合計で点く)', () => {
      const data = toWorkloadData(
        workload({
          rate: 1,
          availableHours: 7.5,
          allocations: [
            alloc({ taskId: '1', hours: 3 }), // 現WBS 3h ≤ 3.75
            alloc({ taskId: '2', hours: 5, projectName: '他PJ' }), // 外部 5h
          ],
        }),
        { rateBasis: { rate: 0.5, standardWorkingHours: 7.5 } }
      );

      const daily = data.dailyAllocations[0];
      expect(daily.isOverRateCapacity).toBe(false);
      expect(daily.overRateHours).toBe(0);
      // 合計8h > 7.5h → 過負荷は点く
      expect(daily.isOverloaded).toBe(true);
    });
  });
});
