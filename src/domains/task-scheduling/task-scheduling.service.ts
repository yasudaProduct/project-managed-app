import { inject, injectable } from 'inversify';
import { Task } from '../task/task';
import { CompanyCalendar } from '../calendar/company-calendar';
import { AssigneeWorkingCalendar } from '../calendar/assignee-working-calendar';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import { SYMBOL } from '@/types/symbol';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';

export interface TaskSchedulingResult {
  taskId: number;
  taskNo: string;
  taskName: string;
  assigneeId?: number;
  assigneeName?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  plannedManHours?: number;
  hasAssignee: boolean;
  errorMessage?: string;
}

@injectable()
export class TaskSchedulingService {
  constructor(
    @inject(SYMBOL.IUserScheduleRepository) private userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
  ) { }

  /**
   * WBSのタスク一覧から前詰めでスケジュールを計算する
   * @param tasks タスクリスト（開始日の早い順にソート済みを想定）
   * @param projectStartDate プロジェクト開始日
   * @returns スケジューリング結果
   */
  public async calculateTaskSchedules(
    tasks: Task[],
    projectStartDate: Date
  ): Promise<TaskSchedulingResult[]> {
    const results: TaskSchedulingResult[] = [];
    const companyCalendar = new CompanyCalendar();

    // 担当者ごとの最後の終了日を管理
    const assigneeLastEndDates = new Map<number, Date>();

    for (const task of tasks) {
      if (!task.id) {
        continue;
      }

      // 担当者が設定されていないタスク
      if (!task.assigneeId || !task.assignee) {
        results.push({
          taskId: task.id,
          taskNo: task.taskNo.getValue(),
          taskName: task.name,
          hasAssignee: false,
          errorMessage: '担当者が設定されていません',
        });
        continue;
      }

      // 予定工数を取得
      const plannedManHours = task.getYoteiKosus();
      if (!plannedManHours || plannedManHours <= 0) {
        results.push({
          taskId: task.id,
          taskNo: task.taskNo.getValue(),
          taskName: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee.name,
          hasAssignee: true,
          errorMessage: '予定工数が設定されていません',
        });
        continue;
      }

      // 担当者のuserIdを取得
      const assignee = await this.wbsAssigneeRepository.findById(task.assigneeId);
      if (!assignee) {
        results.push({
          taskId: task.id,
          taskNo: task.taskNo.getValue(),
          taskName: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee.name,
          hasAssignee: true,
          errorMessage: '担当者が見つかりません',
        })
        continue;
      }

      // 担当者のスケジュールを取得
      const userSchedules = await this.userScheduleRepository.findByUserId(assignee.userId);

      // 担当者の稼働カレンダーを作成
      const assigneeCalendar = new AssigneeWorkingCalendar(
        assignee,
        companyCalendar,
        userSchedules,
      );

      // この担当者の前のタスクの終了日を取得（なければプロジェクト開始日）
      const lastEndDate = assigneeLastEndDates.get(task.assigneeId);
      const taskStartDate = lastEndDate
        ? this.getNextBusinessDay(lastEndDate, assigneeCalendar)
        : projectStartDate;

      // タスクの終了日を計算
      const taskEndDate = this.calculateTaskEndDate(
        taskStartDate,
        plannedManHours,
        assigneeCalendar
      );

      // この担当者の最後の終了日を更新
      assigneeLastEndDates.set(task.assigneeId, taskEndDate);

      // 結果を追加
      results.push({
        taskId: task.id,
        taskNo: task.taskNo.getValue(),
        taskName: task.name,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee.name,
        plannedStartDate: taskStartDate,
        plannedEndDate: taskEndDate,
        plannedManHours: plannedManHours,
        hasAssignee: true,
      });
    }

    return results;
  }

  /**
   * 次の営業日を取得
   */
  private getNextBusinessDay(date: Date, calendar: AssigneeWorkingCalendar): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1); // 翌日から開始

    while (calendar.getAvailableHours(nextDate) === 0) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * タスクの終了日を計算
   * @param startDate 開始日
   * @param totalHours 総工数（時間）
   * @param calendar 担当者の稼働カレンダー
   * @returns 終了日
   */
  private calculateTaskEndDate(
    startDate: Date,
    totalHours: number,
    calendar: AssigneeWorkingCalendar
  ): Date {
    const currentDate = new Date(startDate);
    let remainingHours = totalHours;

    while (remainingHours > 0) {
      const availableHours = calendar.getAvailableHours(currentDate);

      if (availableHours > 0) {
        remainingHours -= availableHours;

        // まだ工数が残っていて、今日の稼働時間を使い切った場合は次の日へ
        if (remainingHours > 0) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // 稼働日でない場合は次の日へ
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return currentDate;
  }

  /**
   * スケジューリング結果をTSV形式に変換
   */
  public convertToTsv(results: TaskSchedulingResult[]): string {
    const headers = [
      'タスクNo',
      'タスク名',
      '担当者',
      '予定開始日',
      '予定終了日',
      '予定工数',
      'エラー',
    ];

    const rows = results.map(result => [
      result.taskNo,
      result.taskName,
      result.assigneeName || '',
      result.plannedStartDate ? this.formatDate(result.plannedStartDate) : '',
      result.plannedEndDate ? this.formatDate(result.plannedEndDate) : '',
      result.plannedManHours?.toString() || '',
      result.errorMessage || '',
    ]);

    return [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
}