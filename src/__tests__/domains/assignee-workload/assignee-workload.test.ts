import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';

describe('AssigneeWorkload', () => {
  const startDate = new Date('2024-01-15');
  const endDate = new Date('2024-01-17');
  
  const createTestAllocations = () => [
    DailyWorkAllocation.create({
      date: new Date('2024-01-15'),
      availableHours: 7.5,
      taskAllocations: [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 4.0 })
      ]
    }),
    DailyWorkAllocation.create({
      date: new Date('2024-01-16'),
      availableHours: 7.5,
      taskAllocations: [
        TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 3.5 }),
        TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 5.0 })
      ]
    }),
    DailyWorkAllocation.create({
      date: new Date('2024-01-17'),
      availableHours: 7.5,
      taskAllocations: [
        TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 2.0 })
      ]
    })
  ];

  describe('create', () => {
    it('AssigneeWorkloadを正常に作成できる', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      expect(workload.assigneeId).toBe('user-1');
      expect(workload.assigneeName).toBe('山田太郎');
      expect(workload.dailyAllocations).toHaveLength(3);
    });

    it('日別配分が空の場合でも作成できる', () => {
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: []
      });

      expect(workload.dailyAllocations).toHaveLength(0);
    });
  });

  describe('getOverloadedDays', () => {
    it('過負荷の日のみを返す', () => {
      const overloadedAllocation = DailyWorkAllocation.create({
        date: new Date('2024-01-16'),
        availableHours: 7.5,
        taskAllocations: [
          TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 8.0 })
        ]
      });

      const normalAllocation = DailyWorkAllocation.create({
        date: new Date('2024-01-17'),
        availableHours: 7.5,
        taskAllocations: [
          TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 6.0 })
        ]
      });

      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: [overloadedAllocation, normalAllocation]
      });

      const overloadedDays = workload.getOverloadedDays();
      
      expect(overloadedDays).toHaveLength(1);
      expect(overloadedDays[0].date).toEqual(new Date('2024-01-16'));
    });

    it('過負荷の日がない場合は空配列を返す', () => {
      const normalAllocations = [
        DailyWorkAllocation.create({
          date: new Date('2024-01-15'),
          availableHours: 7.5,
          taskAllocations: [
            TaskAllocation.create({ taskId: 'task-1', taskName: 'タスク1', allocatedHours: 6.0 })
          ]
        }),
        DailyWorkAllocation.create({
          date: new Date('2024-01-16'),
          availableHours: 7.5,
          taskAllocations: [
            TaskAllocation.create({ taskId: 'task-2', taskName: 'タスク2', allocatedHours: 7.0 })
          ]
        })
      ];

      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: normalAllocations
      });

      expect(workload.getOverloadedDays()).toHaveLength(0);
    });
  });

  describe('getTotalHours', () => {
    it('指定期間内の総作業時間を計算する', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      // 全期間の合計: 4.0 + 8.5 + 2.0 = 14.5
      const total = workload.getTotalHours(startDate, endDate);
      expect(total).toBe(14.5);
    });

    it('期間外の日は計算に含めない', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      // 1/16のみ: 8.5
      const total = workload.getTotalHours(
        new Date('2024-01-16'),
        new Date('2024-01-16')
      );
      expect(total).toBe(8.5);
    });

    it('該当日がない場合は0を返す', () => {
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: []
      });

      const total = workload.getTotalHours(startDate, endDate);
      expect(total).toBe(0);
    });
  });

  describe('getDailyAllocation', () => {
    it('指定日の配分を取得する', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      const allocation = workload.getDailyAllocation(new Date('2024-01-16'));
      
      expect(allocation).toBeDefined();
      expect(allocation!.allocatedHours).toBe(8.5);
    });

    it('該当日がない場合はundefinedを返す', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      const allocation = workload.getDailyAllocation(new Date('2024-01-20'));
      
      expect(allocation).toBeUndefined();
    });
  });

  describe('getDateRange', () => {
    it('配分データの日付範囲を取得する', () => {
      const dailyAllocations = createTestAllocations();
      
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations
      });

      const range = workload.getDateRange();
      
      expect(range.startDate).toEqual(new Date('2024-01-15'));
      expect(range.endDate).toEqual(new Date('2024-01-17'));
    });

    it('配分データが空の場合はnullを返す', () => {
      const workload = AssigneeWorkload.create({
        assigneeId: 'user-1',
        assigneeName: '山田太郎',
        dailyAllocations: []
      });

      const range = workload.getDateRange();
      
      expect(range.startDate).toBeNull();
      expect(range.endDate).toBeNull();
    });
  });
});