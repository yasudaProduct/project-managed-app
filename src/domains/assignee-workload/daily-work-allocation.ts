import { TaskAllocation } from './task-allocation';

/**
 * 一日の作業負荷
 */
export class DailyWorkAllocation {
  public readonly date: Date; // 日付
  public readonly availableHours: number; // 稼働可能時間
  public readonly taskAllocations: TaskAllocation[]; // タスク配分
  public readonly isWeekend: boolean;
  public readonly isCompanyHoliday: boolean; // 会社休日
  public readonly userSchedules: { // ユーザースケジュール
    title: string; // タイトル
    startTime: string; // 開始時間
    endTime: string; // 終了時間
    durationHours: number; // 期間
  }[];

  private constructor(args: {
    date: Date;
    availableHours: number;
    taskAllocations: TaskAllocation[];
    isWeekend?: boolean;
    isCompanyHoliday?: boolean;
    userSchedules?: {
      title: string;
      startTime: string;
      endTime: string;
      durationHours: number;
    }[];
  }) {
    if (args.availableHours < 0) {
      throw new Error('稼働可能時間は0以上である必要があります');
    }

    this.date = args.date;
    this.availableHours = args.availableHours;
    this.taskAllocations = args.taskAllocations;
    this.isWeekend = args.isWeekend ?? false;
    this.isCompanyHoliday = args.isCompanyHoliday ?? false;
    this.userSchedules = args.userSchedules ?? [];
  }

  public static create(args: {
    date: Date;
    availableHours: number;
    taskAllocations: TaskAllocation[];
    isWeekend?: boolean;
    isCompanyHoliday?: boolean;
    userSchedules?: {
      title: string;
      startTime: string;
      endTime: string;
      durationHours: number;
    }[];
  }): DailyWorkAllocation {
    return new DailyWorkAllocation(args);
  }

  /**
   * 配分工数
   * @returns 配分工数
   * @discreption タスク配分の配分工数を合計したもの
   */
  public get allocatedHours(): number {
    return this.taskAllocations.reduce((total, task) => total + task.allocatedHours, 0);
  }

  /**
   * タスク配分を追加
   * @param taskAllocation タスク配分
   * @discreption タスク配分を追加
   */
  public addTaskAllocation(taskAllocation: TaskAllocation): void {
    const existingIndex = this.taskAllocations.findIndex(task =>
      task.equals(taskAllocation)
    );

    if (existingIndex >= 0) {
      // 既存のタスクの工数を加算
      const existingTask = this.taskAllocations[existingIndex];
      const updatedTask = existingTask.addHours(taskAllocation.allocatedHours);
      this.taskAllocations[existingIndex] = updatedTask;
    } else {
      // 新しいタスクを追加
      this.taskAllocations.push(taskAllocation);
    }
  }
}