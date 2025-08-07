/**
 * 進捗履歴ドメインサービス
 */

import { WbsProgressHistory, RecordType } from './wbs-progress-history';
import { TaskProgressHistory } from './task-progress-history';

export interface WbsTaskData {
  id: number;
  taskNo: string;
  name: string;
  status: string;
  assigneeId?: number;
  assigneeName?: string;
  phaseId?: number;
  phaseName?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  plannedManHours: number;
  actualManHours: number;
  progressRate: number;
}

export interface ProgressAggregation {
  totalTaskCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  plannedManHours: number;
  actualManHours: number;
  varianceManHours: number;
  phaseAggregations: PhaseAggregation[];
  assigneeAggregations: AssigneeAggregation[];
}

export interface PhaseAggregation {
  phaseId?: number;
  phaseName?: string;
  taskCount: number;
  completedCount: number;
  plannedManHours: number;
  actualManHours: number;
  completionRate: number;
}

export interface AssigneeAggregation {
  assigneeId?: number;
  assigneeName?: string;
  taskCount: number;
  completedCount: number;
  plannedManHours: number;
  actualManHours: number;
  completionRate: number;
}

export class ProgressHistoryService {
  
  /**
   * タスクデータから進捗集計を計算
   */
  static calculateAggregation(tasks: WbsTaskData[]): ProgressAggregation {
    const totalTaskCount = tasks.length;
    const completedCount = tasks.filter(task => task.status === 'COMPLETED').length;
    const inProgressCount = tasks.filter(task => task.status === 'IN_PROGRESS').length;
    const notStartedCount = tasks.filter(task => task.status === 'NOT_STARTED').length;
    
    const completionRate = totalTaskCount === 0 ? 0 : (completedCount / totalTaskCount) * 100;
    
    const plannedManHours = tasks.reduce((sum, task) => sum + task.plannedManHours, 0);
    const actualManHours = tasks.reduce((sum, task) => sum + task.actualManHours, 0);
    const varianceManHours = actualManHours - plannedManHours;

    // フェーズ別集計
    const phaseGroups = this.groupByPhase(tasks);
    const phaseAggregations = Array.from(phaseGroups.entries()).map(([key, phaseTasks]) => {
      const [phaseId, phaseName] = key.split('|');
      return this.calculatePhaseAggregation(
        phaseId === 'undefined' ? undefined : parseInt(phaseId),
        phaseName === 'undefined' ? undefined : phaseName,
        phaseTasks
      );
    });

    // 担当者別集計
    const assigneeGroups = this.groupByAssignee(tasks);
    const assigneeAggregations = Array.from(assigneeGroups.entries()).map(([key, assigneeTasks]) => {
      const [assigneeId, assigneeName] = key.split('|');
      return this.calculateAssigneeAggregation(
        assigneeId === 'undefined' ? undefined : parseInt(assigneeId),
        assigneeName === 'undefined' ? undefined : assigneeName,
        assigneeTasks
      );
    });

    return {
      totalTaskCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionRate,
      plannedManHours,
      actualManHours,
      varianceManHours,
      phaseAggregations,
      assigneeAggregations,
    };
  }

  /**
   * 自動進捗記録を作成
   */
  static createAutoProgressRecord(
    wbsId: number,
    tasks: WbsTaskData[]
  ): WbsProgressHistory {
    const aggregation = this.calculateAggregation(tasks);
    
    const taskHistories = tasks.map(task => 
      new TaskProgressHistory({
        taskId: task.id,
        taskNo: task.taskNo,
        taskName: task.name,
        status: task.status,
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        phaseId: task.phaseId,
        phaseName: task.phaseName,
        plannedStartDate: task.plannedStartDate,
        plannedEndDate: task.plannedEndDate,
        actualStartDate: task.actualStartDate,
        actualEndDate: task.actualEndDate,
        plannedManHours: task.plannedManHours,
        actualManHours: task.actualManHours,
        progressRate: task.progressRate,
      })
    );

    // メタデータに詳細集計を格納
    const metadata = {
      phaseAggregations: aggregation.phaseAggregations,
      assigneeAggregations: aggregation.assigneeAggregations,
      recordedTaskCount: tasks.length,
    };

    return new WbsProgressHistory({
      wbsId,
      recordedAt: new Date(),
      recordType: RecordType.AUTO,
      totalTaskCount: aggregation.totalTaskCount,
      completedCount: aggregation.completedCount,
      inProgressCount: aggregation.inProgressCount,
      notStartedCount: aggregation.notStartedCount,
      completionRate: aggregation.completionRate,
      plannedManHours: aggregation.plannedManHours,
      actualManHours: aggregation.actualManHours,
      varianceManHours: aggregation.varianceManHours,
      metadata,
      taskHistories,
    });
  }

  /**
   * 手動スナップショットを作成
   */
  static createManualSnapshot(
    wbsId: number,
    snapshotName: string,
    tasks: WbsTaskData[]
  ): WbsProgressHistory {
    const aggregation = this.calculateAggregation(tasks);
    
    const taskHistories = tasks.map(task => 
      new TaskProgressHistory({
        taskId: task.id,
        taskNo: task.taskNo,
        taskName: task.name,
        status: task.status,
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        phaseId: task.phaseId,
        phaseName: task.phaseName,
        plannedStartDate: task.plannedStartDate,
        plannedEndDate: task.plannedEndDate,
        actualStartDate: task.actualStartDate,
        actualEndDate: task.actualEndDate,
        plannedManHours: task.plannedManHours,
        actualManHours: task.actualManHours,
        progressRate: task.progressRate,
      })
    );

    // メタデータに詳細集計を格納
    const metadata = {
      phaseAggregations: aggregation.phaseAggregations,
      assigneeAggregations: aggregation.assigneeAggregations,
      recordedTaskCount: tasks.length,
      snapshotReason: `手動スナップショット: ${snapshotName}`,
    };

    return new WbsProgressHistory({
      wbsId,
      recordedAt: new Date(),
      recordType: RecordType.MANUAL_SNAPSHOT,
      snapshotName,
      totalTaskCount: aggregation.totalTaskCount,
      completedCount: aggregation.completedCount,
      inProgressCount: aggregation.inProgressCount,
      notStartedCount: aggregation.notStartedCount,
      completionRate: aggregation.completionRate,
      plannedManHours: aggregation.plannedManHours,
      actualManHours: aggregation.actualManHours,
      varianceManHours: aggregation.varianceManHours,
      metadata,
      taskHistories,
    });
  }

  private static groupByPhase(tasks: WbsTaskData[]): Map<string, WbsTaskData[]> {
    const groups = new Map<string, WbsTaskData[]>();
    
    tasks.forEach(task => {
      const key = `${task.phaseId}|${task.phaseName}`;
      const group = groups.get(key) || [];
      group.push(task);
      groups.set(key, group);
    });
    
    return groups;
  }

  private static groupByAssignee(tasks: WbsTaskData[]): Map<string, WbsTaskData[]> {
    const groups = new Map<string, WbsTaskData[]>();
    
    tasks.forEach(task => {
      const key = `${task.assigneeId}|${task.assigneeName}`;
      const group = groups.get(key) || [];
      group.push(task);
      groups.set(key, group);
    });
    
    return groups;
  }

  private static calculatePhaseAggregation(
    phaseId: number | undefined,
    phaseName: string | undefined,
    tasks: WbsTaskData[]
  ): PhaseAggregation {
    const taskCount = tasks.length;
    const completedCount = tasks.filter(task => task.status === 'COMPLETED').length;
    const plannedManHours = tasks.reduce((sum, task) => sum + task.plannedManHours, 0);
    const actualManHours = tasks.reduce((sum, task) => sum + task.actualManHours, 0);
    const completionRate = taskCount === 0 ? 0 : (completedCount / taskCount) * 100;

    return {
      phaseId,
      phaseName,
      taskCount,
      completedCount,
      plannedManHours,
      actualManHours,
      completionRate,
    };
  }

  private static calculateAssigneeAggregation(
    assigneeId: number | undefined,
    assigneeName: string | undefined,
    tasks: WbsTaskData[]
  ): AssigneeAggregation {
    const taskCount = tasks.length;
    const completedCount = tasks.filter(task => task.status === 'COMPLETED').length;
    const plannedManHours = tasks.reduce((sum, task) => sum + task.plannedManHours, 0);
    const actualManHours = tasks.reduce((sum, task) => sum + task.actualManHours, 0);
    const completionRate = taskCount === 0 ? 0 : (completedCount / taskCount) * 100;

    return {
      assigneeId,
      assigneeName,
      taskCount,
      completedCount,
      plannedManHours,
      actualManHours,
      completionRate,
    };
  }
}