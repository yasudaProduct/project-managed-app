import {
  TaskSchedulingResult,
  ScheduleCalcMode,
} from "./task-scheduling-application.service";

export interface ITaskSchedulingApplicationService {
  calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]>;
  /**
   * タスク依存関係（FS/SS/FF/SF + lag）を考慮してスケジュールを計算する。
   * @param anchorDate 前詰めの起点（省略時はプロジェクト開始日）
   * @param mode plan=全タスク前詰め / reschedule=完了固定・着手中は終了のみ再計算
   */
  calculateWbsTaskSchedulesWithDependencies(
    wbsId: number,
    anchorDate?: Date,
    mode?: ScheduleCalcMode,
  ): Promise<TaskSchedulingResult[]>;
  convertToTsv(results: TaskSchedulingResult[]): string;
}