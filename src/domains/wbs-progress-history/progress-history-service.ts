/**
 * 進捗履歴ドメインサービス
 */

import { WbsProgressHistory, RecordType } from './wbs-progress-history';
import { TaskProgressHistory } from './task-progress-history';
import { Task } from '../task/task';


export class ProgressHistoryService {


  /**
   * 自動進捗記録を作成
   */
  static createAutoProgressRecord(
    wbsId: number,
    tasks: Task[]
  ): WbsProgressHistory {
    const aggregation = Task.calculateAggregation(tasks);

    const taskHistories = tasks.map(task =>
      new TaskProgressHistory({
        taskId: task.id!,
        taskNo: task.taskNo.getValue(),
        taskName: task.name,
        status: task.status.getStatus(),
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.name,
        phaseId: task.phaseId,
        phaseName: task.phase?.name,
        plannedStartDate: task.getYoteiStart(),
        plannedEndDate: task.getYoteiEnd(),
        actualStartDate: task.getJissekiStart(),
        actualEndDate: task.getJissekiEnd(),
        plannedManHours: task.getYoteiKosus() || 0,
        actualManHours: task.getJissekiKosus() || 0,
        progressRate: task.getProgressRate(),
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
    tasks: Task[]
  ): WbsProgressHistory {
    const aggregation = Task.calculateAggregation(tasks);

    const taskHistories = tasks.map(task =>
      new TaskProgressHistory({
        taskId: task.id!,
        taskNo: task.taskNo.getValue(),
        taskName: task.name,
        status: task.status.getStatus(),
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.name,
        phaseId: task.phaseId,
        phaseName: task.phase?.name,
        plannedStartDate: task.getYoteiStart(),
        plannedEndDate: task.getYoteiEnd(),
        actualStartDate: task.getJissekiStart(),
        actualEndDate: task.getJissekiEnd(),
        plannedManHours: task.getYoteiKosus() || 0,
        actualManHours: task.getJissekiKosus() || 0,
        progressRate: task.getProgressRate(),
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

}