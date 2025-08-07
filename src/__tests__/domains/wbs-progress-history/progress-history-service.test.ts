import { ProgressHistoryService, WbsTaskData, RecordType } from '../../../domains/wbs-progress-history';

describe('ProgressHistoryService', () => {
  const sampleTasks: WbsTaskData[] = [
    {
      id: 1,
      taskNo: '001',
      name: 'タスク1',
      status: 'COMPLETED',
      assigneeId: 1,
      assigneeName: '田中太郎',
      phaseId: 1,
      phaseName: '設計',
      plannedStartDate: new Date('2024-01-01'),
      plannedEndDate: new Date('2024-01-10'),
      actualStartDate: new Date('2024-01-01'),
      actualEndDate: new Date('2024-01-08'),
      plannedManHours: 40,
      actualManHours: 32,
      progressRate: 100,
    },
    {
      id: 2,
      taskNo: '002',
      name: 'タスク2',
      status: 'IN_PROGRESS',
      assigneeId: 2,
      assigneeName: '佐藤花子',
      phaseId: 1,
      phaseName: '設計',
      plannedStartDate: new Date('2024-01-05'),
      plannedEndDate: new Date('2024-01-15'),
      actualStartDate: new Date('2024-01-05'),
      plannedManHours: 60,
      actualManHours: 30,
      progressRate: 50,
    },
    {
      id: 3,
      taskNo: '003',
      name: 'タスク3',
      status: 'NOT_STARTED',
      assigneeId: 1,
      assigneeName: '田中太郎',
      phaseId: 2,
      phaseName: '実装',
      plannedStartDate: new Date('2024-01-16'),
      plannedEndDate: new Date('2024-01-25'),
      plannedManHours: 80,
      actualManHours: 0,
      progressRate: 0,
    },
  ];

  describe('calculateAggregation', () => {
    it('タスクデータから正しい集計を計算する', () => {
      const aggregation = ProgressHistoryService.calculateAggregation(sampleTasks);

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
      const aggregation = ProgressHistoryService.calculateAggregation(sampleTasks);

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
      const aggregation = ProgressHistoryService.calculateAggregation(sampleTasks);

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
      const aggregation = ProgressHistoryService.calculateAggregation([]);

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