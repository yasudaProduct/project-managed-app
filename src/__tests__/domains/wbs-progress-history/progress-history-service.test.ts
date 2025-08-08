import { ProgressHistoryService, RecordType } from '../../../domains/wbs-progress-history';
import { Task } from '../../../domains/task/task';
import { TaskNo } from '../../../domains/task/value-object/task-id';
import { TaskStatus } from '../../../domains/task/value-object/project-status';
import { Assignee } from '../../../domains/task/assignee';
import { Phase } from '../../../domains/phase/phase';
import { Period } from '../../../domains/task/period';
import { PeriodType } from '../../../domains/task/value-object/period-type';
import { ManHour } from '../../../domains/task/man-hour';
import { ManHourType } from '../../../domains/task/value-object/man-hour-type';
import { WorkRecord } from '../../../domains/work-records/work-recoed';
import { PhaseCode } from '../../../domains/phase/phase-code';

describe('ProgressHistoryService', () => {
  const createTestTask = (args: {
    id: number;
    taskNo: string;
    name: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    assigneeId?: number;
    assigneeName?: string;
    phaseId?: number;
    phaseName?: string;
    plannedStart?: Date;
    plannedEnd?: Date;
    plannedHours?: number;
    actualStart?: Date;
    actualEnd?: Date;
    actualHours?: number;
  }): Task => {
    const periods: Period[] = [];
    
    // 予定期間を追加
    if (args.plannedStart && args.plannedEnd && args.plannedHours !== undefined) {
      const manHour = ManHour.create({
        type: new ManHourType({ type: 'NORMAL' }),
        kosu: args.plannedHours
      });
      periods.push(Period.create({
        type: new PeriodType({ type: 'YOTEI' }),
        startDate: args.plannedStart,
        endDate: args.plannedEnd,
        manHours: [manHour]
      }));
    }
    
    // 実績期間を追加（WorkRecordとして扱う）
    const workRecords: WorkRecord[] = [];
    if (args.actualStart && args.actualEnd && args.actualHours !== undefined) {
      workRecords.push(WorkRecord.createFromDb({
        id: 1,
        userId: 'user1',
        taskId: args.id,
        startDate: args.actualStart,
        endDate: args.actualEnd,
        manHours: args.actualHours
      }));
    }

    return Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(args.taskNo),
      wbsId: 1,
      name: args.name,
      status: new TaskStatus({ status: args.status }),
      assigneeId: args.assigneeId,
      assignee: args.assigneeId && args.assigneeName ? 
        Assignee.createFromDb({
          id: args.assigneeId,
          name: args.assigneeName,
          displayName: args.assigneeName
        }) : undefined,
      phaseId: args.phaseId,
      phase: args.phaseId && args.phaseName ?
        Phase.createFromDb({
          id: args.phaseId,
          name: args.phaseName,
          code: new PhaseCode('P'),
          seq: 1
        }) : undefined,
      periods,
      workRecords,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  const sampleTasks: Task[] = [
    createTestTask({
      id: 1,
      taskNo: 'P1-0001',
      name: 'タスク1',
      status: 'COMPLETED',
      assigneeId: 1,
      assigneeName: '田中太郎',
      phaseId: 1,
      phaseName: '設計',
      plannedStart: new Date('2024-01-01'),
      plannedEnd: new Date('2024-01-10'),
      plannedHours: 40,
      actualStart: new Date('2024-01-01'),
      actualEnd: new Date('2024-01-08'),
      actualHours: 32
    }),
    createTestTask({
      id: 2,
      taskNo: 'P1-0002',
      name: 'タスク2',
      status: 'IN_PROGRESS',
      assigneeId: 2,
      assigneeName: '佐藤花子',
      phaseId: 1,
      phaseName: '設計',
      plannedStart: new Date('2024-01-05'),
      plannedEnd: new Date('2024-01-15'),
      plannedHours: 60,
      actualStart: new Date('2024-01-05'),
      actualEnd: new Date('2024-01-10'),
      actualHours: 30
    }),
    createTestTask({
      id: 3,
      taskNo: 'P2-0003',
      name: 'タスク3',
      status: 'NOT_STARTED',
      assigneeId: 1,
      assigneeName: '田中太郎',
      phaseId: 2,
      phaseName: '実装',
      plannedStart: new Date('2024-01-16'),
      plannedEnd: new Date('2024-01-25'),
      plannedHours: 80
    })
  ];

  describe('calculateAggregation', () => {
    it('タスクデータから正しい集計を計算する', () => {
      const aggregation = Task.calculateAggregation(sampleTasks);

      expect(aggregation.totalTaskCount).toBe(3);
      expect(aggregation.completedCount).toBe(1);
      expect(aggregation.inProgressCount).toBe(1);
      expect(aggregation.notStartedCount).toBe(1);
      expect(aggregation.completionRate).toBeCloseTo(33.33, 2);
      expect(aggregation.plannedManHours).toBe(180);
      expect(aggregation.actualManHours).toBe(62);
      expect(aggregation.varianceManHours).toBe(-118);
    });

    it('フェーズ別集計を正しく計算する', () => {
      const aggregation = Task.calculateAggregation(sampleTasks);

      expect(aggregation.phaseAggregations).toHaveLength(2);

      const designPhase = aggregation.phaseAggregations.find(p => p.phaseName === '設計');
      expect(designPhase).toBeDefined();
      expect(designPhase!.taskCount).toBe(2);
      expect(designPhase!.completedCount).toBe(1);
      expect(designPhase!.plannedManHours).toBe(100);
      expect(designPhase!.actualManHours).toBe(62);
      expect(designPhase!.completionRate).toBe(50);

      const implementPhase = aggregation.phaseAggregations.find(p => p.phaseName === '実装');
      expect(implementPhase).toBeDefined();
      expect(implementPhase!.taskCount).toBe(1);
      expect(implementPhase!.completedCount).toBe(0);
      expect(implementPhase!.plannedManHours).toBe(80);
      expect(implementPhase!.actualManHours).toBe(0);
    });

    it('担当者別集計を正しく計算する', () => {
      const aggregation = Task.calculateAggregation(sampleTasks);

      expect(aggregation.assigneeAggregations).toHaveLength(2);

      const tanaka = aggregation.assigneeAggregations.find(a => a.assigneeName === '田中太郎');
      expect(tanaka).toBeDefined();
      expect(tanaka!.taskCount).toBe(2);
      expect(tanaka!.completedCount).toBe(1);
      expect(tanaka!.plannedManHours).toBe(120);
      expect(tanaka!.actualManHours).toBe(32);

      const sato = aggregation.assigneeAggregations.find(a => a.assigneeName === '佐藤花子');
      expect(sato).toBeDefined();
      expect(sato!.taskCount).toBe(1);
      expect(sato!.completedCount).toBe(0);
      expect(sato!.plannedManHours).toBe(60);
      expect(sato!.actualManHours).toBe(30);
    });

    it('空のタスクリストでも正しく処理する', () => {
      const aggregation = Task.calculateAggregation([]);

      expect(aggregation.totalTaskCount).toBe(0);
      expect(aggregation.completedCount).toBe(0);
      expect(aggregation.completionRate).toBe(0);
      expect(aggregation.plannedManHours).toBe(0);
      expect(aggregation.actualManHours).toBe(0);
      expect(aggregation.phaseAggregations).toHaveLength(0);
      expect(aggregation.assigneeAggregations).toHaveLength(0);
    });
  });

  describe('createAutoProgressRecord', () => {
    it('自動進捗記録を正しく作成する', () => {
      const progressHistory = ProgressHistoryService.createAutoProgressRecord(1, sampleTasks);

      expect(progressHistory.wbsId).toBe(1);
      expect(progressHistory.recordType).toBe(RecordType.AUTO);
      expect(progressHistory.totalTaskCount).toBe(3);
      expect(progressHistory.completedCount).toBe(1);
      expect(progressHistory.inProgressCount).toBe(1);
      expect(progressHistory.notStartedCount).toBe(1);
      expect(progressHistory.plannedManHours).toBe(180);
      expect(progressHistory.actualManHours).toBe(62);
      expect(progressHistory.varianceManHours).toBe(-118);
      expect(progressHistory.taskHistories).toHaveLength(3);
      expect(progressHistory.metadata).toBeDefined();
    });
  });

  describe('createManualSnapshot', () => {
    it('手動スナップショットを正しく作成する', () => {
      const progressHistory = ProgressHistoryService.createManualSnapshot(
        1,
        'テストスナップショット',
        sampleTasks
      );

      expect(progressHistory.wbsId).toBe(1);
      expect(progressHistory.recordType).toBe(RecordType.MANUAL_SNAPSHOT);
      expect(progressHistory.snapshotName).toBe('テストスナップショット');
      expect(progressHistory.totalTaskCount).toBe(3);
      expect(progressHistory.taskHistories).toHaveLength(3);
      expect(progressHistory.metadata?.snapshotReason).toBe('手動スナップショット: テストスナップショット');
    });
  });
});