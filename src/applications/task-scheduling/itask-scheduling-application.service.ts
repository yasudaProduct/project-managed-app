import { TaskSchedulingResult } from "./task-scheduling-application.service";

export interface ITaskSchedulingApplicationService {
  calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]>;
  /**
   * タスク依存関係（FS/SS/FF/SF + lag）を考慮してスケジュールを計算する。
   * @param anchorDate 前詰めの起点（省略時はプロジェクト開始日）
   */
  calculateWbsTaskSchedulesWithDependencies(
    wbsId: number,
    anchorDate?: Date,
  ): Promise<TaskSchedulingResult[]>;
  convertToTsv(results: TaskSchedulingResult[]): string;
}