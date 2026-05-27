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

export type SchedulingMode = 'initial' | 'reschedule';

export interface TaskSchedulingOptions {
  mode?: SchedulingMode;
  /** リスケモード時の全体起点日（必須） */
  rescheduleBaseDate?: Date;
  /** 担当者ごとの起点日（任意） */
  assigneeStartDates?: Map<number, Date>;
}

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

  async calculateWbsTaskSchedules(wbsId: number, options?: TaskSchedulingOptions): Promise<TaskSchedulingResult[]> {
    const mode = options?.mode ?? 'initial';
    const assigneeStartDates = options?.assigneeStartDates ?? new Map();

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

    // 全体起点日の決定
    let globalBaseDate: Date;
    if (mode === 'reschedule') {
      if (!options?.rescheduleBaseDate) {
        throw new Error('リスケモードではrescheduleBaseDateが必要です');
      }
      globalBaseDate = options.rescheduleBaseDate;
    } else {
      const projectStartDate = project.startDate;
      if (!projectStartDate) {
        throw new Error('プロジェクトの基準開始日が設定されていません');
      }
      globalBaseDate = projectStartDate;
    }

    // WBSに紐付くタスクを取得
    const tasks = await this.taskRepository.findByWbsId(wbsId);

    // 前詰めのためタスク番号でソート
    const sortedTasks = tasks.sort((a, b) => {
      return a.taskNo.getValue().localeCompare(b.taskNo.getValue());
    });

    // スケジューリングを実行
    const results = await this.calculateTaskSchedules(
      sortedTasks,
      globalBaseDate,
      mode,
      assigneeStartDates,
    );

    return results;
  }

  private async calculateTaskSchedules(
    tasks: Task[],
    globalBaseDate: Date,
    mode: SchedulingMode,
    assigneeStartDates: Map<number, Date>,
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

      // リスケモード: 完了タスクの処理
      if (mode === 'reschedule' && task.getStatus() === 'COMPLETED') {
        const jissekiStart = task.getJissekiStart();
        const jissekiEnd = task.getJissekiEnd();
        results.push({
          taskId: task.id,
          taskNo: task.taskNo.getValue(),
          taskName: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee.name,
          plannedStartDate: jissekiStart,
          plannedEndDate: jissekiEnd,
          plannedManHours: task.getJissekiKosus(),
          hasAssignee: true,
        });
        // 担当者の最終終了日を実績終了日で更新
        if (jissekiEnd) {
          const current = assigneeLastEndDates.get(task.assigneeId);
          if (!current || jissekiEnd.getTime() > current.getTime()) {
            assigneeLastEndDates.set(task.assigneeId, jissekiEnd);
          }
        }
        continue;
      }

      // リスケモード: 進行中タスクの処理
      if (mode === 'reschedule' && task.getStatus() === 'IN_PROGRESS') {
        const jissekiStart = task.getJissekiStart();
        const jissekiKosu = task.getJissekiKosus() ?? 0;
        const yoteiKosu = task.getYoteiKosus() ?? 0;
        const remainingHours = Math.max(0, yoteiKosu - jissekiKosu);

        if (remainingHours <= 0) {
          results.push({
            taskId: task.id,
            taskNo: task.taskNo.getValue(),
            taskName: task.name,
            assigneeId: task.assigneeId,
            assigneeName: task.assignee.name,
            plannedStartDate: jissekiStart,
            plannedEndDate: task.getJissekiEnd(),
            plannedManHours: 0,
            hasAssignee: true,
          });
          if (task.getJissekiEnd()) {
            const current = assigneeLastEndDates.get(task.assigneeId);
            if (!current || task.getJissekiEnd()!.getTime() > current.getTime()) {
              assigneeLastEndDates.set(task.assigneeId, task.getJissekiEnd()!);
            }
          }
          continue;
        }

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
          });
          continue;
        }

        const userSchedules = await this.userScheduleRepository.findByUserId(assignee.userId);
        const assigneeCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules);

        const taskEndDate = this.calculateTaskEndDate(globalBaseDate, remainingHours, assigneeCalendar);
        assigneeLastEndDates.set(task.assigneeId, taskEndDate);

        results.push({
          taskId: task.id,
          taskNo: task.taskNo.getValue(),
          taskName: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee.name,
          plannedStartDate: jissekiStart,
          plannedEndDate: taskEndDate,
          plannedManHours: remainingHours,
          hasAssignee: true,
        });
        continue;
      }

      // 予定工数を取得（初期計画モード & リスケモード未着手共通）
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
        });
        continue;
      }

      const userSchedules = await this.userScheduleRepository.findByUserId(assignee.userId);
      const assigneeCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules);

      // 担当者の起点日を決定
      const assigneeBaseDate = assigneeStartDates.get(task.assigneeId) ?? globalBaseDate;

      // この担当者の前のタスクの終了日を取得
      const lastEndDate = assigneeLastEndDates.get(task.assigneeId);
      let taskStartDate: Date;
      if (lastEndDate) {
        const nextBizDay = this.getNextBusinessDay(lastEndDate, assigneeCalendar);
        taskStartDate = nextBizDay.getTime() > assigneeBaseDate.getTime()
          ? nextBizDay
          : assigneeBaseDate;
      } else {
        taskStartDate = assigneeBaseDate;
      }

      const taskEndDate = this.calculateTaskEndDate(taskStartDate, plannedManHours, assigneeCalendar);
      assigneeLastEndDates.set(task.assigneeId, taskEndDate);

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

  private getNextBusinessDay(date: Date, calendar: AssigneeWorkingCalendar): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    while (calendar.getAvailableHours(nextDate) === 0) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

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

        if (remainingHours > 0) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return currentDate;
  }

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
