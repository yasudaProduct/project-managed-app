import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';

describe('DailyWorkAllocation', () => {
  const testDate = new Date('2024-01-15');

  describe('create', () => {
    it('DailyWorkAllocationを正常に作成できる', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 2.0 }),
        TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 3.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.date).toEqual(testDate);
      expect(allocation.availableHours).toBe(7.5);
      expect(allocation.taskAllocations).toHaveLength(2);
      expect(allocation.allocatedHours).toBe(5.0);
    });

    it('タスク配分が空の場合でも作成できる', () => {
      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations: []
      });

      expect(allocation.allocatedHours).toBe(0);
      expect(allocation.taskAllocations).toHaveLength(0);
    });

    it('稼働可能時間が負の値の場合はエラーを投げる', () => {
      expect(() => {
        DailyWorkAllocation.create({
          date: testDate,
          availableHours: -1,
          taskAllocations: []
        });
      }).toThrow('稼働可能時間は0以上である必要があります');
    });
  });

  describe('allocatedHours', () => {
    it('全タスクの配分工数の合計を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 2.5 }),
        TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 3.0 }),
        TaskAllocation.create({ taskId: 'task-3', taskName: 'タスク3', allocatedHours: 1.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.allocatedHours).toBe(6.5);
    });
  });

  describe('isOverloaded', () => {
    it('配分工数が稼働可能時間を超える場合はtrueを返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 8.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.isOverloaded()).toBe(true);
    });

    it('配分工数が稼働可能時間以下の場合はfalseを返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 7.5 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.isOverloaded()).toBe(false);
    });

    it('配分工数が0の場合はfalseを返す', () => {
      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations: []
      });

      expect(allocation.isOverloaded()).toBe(false);
    });
  });

  describe('getUtilizationRate', () => {
    it('配分工数 / 稼働可能時間の比率を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 3.75 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.getUtilizationRate()).toBe(0.5);
    });

    it('稼働可能時間が0の場合は0を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 2.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 0,
        taskAllocations
      });

      expect(allocation.getUtilizationRate()).toBe(0);
    });

    it('100%を超える場合も正しい値を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 15.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.getUtilizationRate()).toBe(2.0);
    });
  });

  describe('getOverloadedHours', () => {
    it('過負荷の時間数を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 9.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.getOverloadedHours()).toBe(1.5);
    });

    it('過負荷でない場合は0を返す', () => {
      const taskAllocations = [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 6.0 })
      ];

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations
      });

      expect(allocation.getOverloadedHours()).toBe(0);
    });
  });

  describe('addTaskAllocation', () => {
    it('タスク配分を追加できる', () => {
      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations: []
      });

      const newTask = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1',
        allocatedHours: 3.0
      });

      allocation.addTaskAllocation(newTask);

      expect(allocation.taskAllocations).toHaveLength(1);
      expect(allocation.allocatedHours).toBe(3.0);
    });

    it('既存のタスクがある場合は工数を加算する', () => {
      const existingTask = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1',
        allocatedHours: 2.0
      });

      const allocation = DailyWorkAllocation.create({
        date: testDate,
        availableHours: 7.5,
        taskAllocations: [existingTask]
      });

      const additionalTask = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1',
        allocatedHours: 3.0
      });

      allocation.addTaskAllocation(additionalTask);

      expect(allocation.taskAllocations).toHaveLength(1);
      expect(allocation.taskAllocations[0].allocatedHours).toBe(5.0);
    });
  });
});