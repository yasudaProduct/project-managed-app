import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';

describe('TaskAllocation', () => {
  describe('create', () => {
    it('TaskAllocationを正常に作成できる', () => {
      const taskAllocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'サンプルタスク',
        allocatedHours: 4.0
      });

      expect(taskAllocation.taskId).toBe('task-1');
      expect(taskAllocation.taskName).toBe('サンプルタスク');
      expect(taskAllocation.allocatedHours).toBe(4.0);
    });

    it('工数が0の場合でも作成できる', () => {
      const taskAllocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'サンプルタスク',
        allocatedHours: 0
      });

      expect(taskAllocation.allocatedHours).toBe(0);
    });

    it('工数が負の値の場合はエラーを投げる', () => {
      expect(() => {
        TaskAllocation.create({
          taskId: 'task-1',
          taskName: 'サンプルタスク',
          allocatedHours: -1
        });
      }).toThrow('配分工数は0以上である必要があります');
    });
  });

  describe('getFormattedHours', () => {
    it('工数を小数点第1位で表示する', () => {
      const taskAllocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'サンプルタスク',
        allocatedHours: 4.5
      });

      expect(taskAllocation.getFormattedHours()).toBe('4.5');
    });

    it('0時間の場合は"0.0"を返す', () => {
      const taskAllocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'サンプルタスク',
        allocatedHours: 0
      });

      expect(taskAllocation.getFormattedHours()).toBe('0.0');
    });
  });

  describe('projectName', () => {
    it('projectNameを指定して作成できる', () => {
      const allocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク',
        allocatedHours: 2.0,
        totalHours: 4.0,
        projectName: 'プロジェクトA'
      });

      expect(allocation.projectName).toBe('プロジェクトA');
    });

    it('未指定の場合はundefinedになる', () => {
      const allocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク',
        allocatedHours: 2.0,
        totalHours: 4.0
      });

      expect(allocation.projectName).toBeUndefined();
    });

    it('addHoursでprojectNameが引き継がれる', () => {
      const allocation = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク',
        allocatedHours: 2.0,
        totalHours: 4.0,
        projectName: 'プロジェクトA'
      });

      const added = allocation.addHours(1.0);

      expect(added.allocatedHours).toBe(3.0);
      expect(added.projectName).toBe('プロジェクトA');
    });
  });

  describe('equals', () => {
    it('同じタスクIDの場合はtrueを返す', () => {
      const allocation1 = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1',
        allocatedHours: 4.0
      });

      const allocation2 = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1-2', // 名前が違っても同じタスクとみなす
        allocatedHours: 2.0
      });

      expect(allocation1.equals(allocation2)).toBe(true);
    });

    it('異なるタスクIDの場合はfalseを返す', () => {
      const allocation1 = TaskAllocation.create({
        taskId: 'task-1',
        taskName: 'タスク1',
        allocatedHours: 4.0
      });

      const allocation2 = TaskAllocation.create({
        taskId: 'task-2',
        taskName: 'タスク2',
        allocatedHours: 4.0
      });

      expect(allocation1.equals(allocation2)).toBe(false);
    });
  });
});