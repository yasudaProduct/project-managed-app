import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsRepository } from '../wbs/iwbs-repository';
import type { ITaskRepository } from '../task/itask-repository';
import { ITaskSchedulingApplicationService } from './itask-scheduling-application.service';
import type { IProjectRepository } from '../projects/iproject-repository';
import { Task } from '@/domains/task/task';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { AssigneeWorkingCalendar } from '@/domains/calendar/assignee-working-calendar';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';

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
export class TaskSchedulingApplicationService implements ITaskSchedulingApplicationService {
  constructor(
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository,
    @inject(SYMBOL.IUserScheduleRepository) private userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ISystemSettingsRepository) private systemSettingsRepository: ISystemSettingsRepository,
  ) { }

  /**
   * WBSのタスクスケジュールを計算
   * @param wbsId WBS ID
   * @returns スケジューリング結果
   */
  async calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]> {
    console.log("calculateWbsTaskSchedules", wbsId);
    // WBSを取得
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) {
      throw new Error('WBSが見つかりません');
    }

    if (!wbs.projectId) {
      throw new Error('WBSに紐付くプロジェクトが見つかりません');
    }

    const project = await this.projectRepository.findById(wbs.projectId);
    if (!project) {
      throw new Error('プロジェクトが見つかりません');
    }

    const projectStartDate = project.startDate;
    if (!projectStartDate) {
      throw new Error('プロジェクトの基準開始日が設定されていません');
    }

    // WBSに紐付くタスクを取得
    const tasks = await this.taskRepository.findByWbsId(wbsId);

    // 前詰めのためタスク番号でソート（一旦TaskNo順とし、優先度の追加を検討する）
    const sortedTasks = tasks.sort((a, b) => {
      return a.taskNo.getValue().localeCompare(b.taskNo.getValue());
    });

    // スケジューリングを実行
    const results = await this.calculateTaskSchedules(
      sortedTasks,
      projectStartDate
    );

    return results;
  }

  /**
   * WBSのタスク一覧から前詰めでスケジュールを計算する
   * @param tasks タスクリスト（開始日の早い順にソート済みを想定）
   * @param projectStartDate プロジェクト開始日
   * @returns スケジューリング結果
   */
  private async calculateTaskSchedules(
    tasks: Task[],
    projectStartDate: Date
  ): Promise<TaskSchedulingResult[]> {
    const results: TaskSchedulingResult[] = [];
    const systemSettings = await this.systemSettingsRepository.get();
    const companyCalendar = new CompanyCalendar(systemSettings.standardWorkingHours);

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
  convertToTsv(results: TaskSchedulingResult[]): string {
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