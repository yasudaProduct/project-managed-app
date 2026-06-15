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
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { TaskDependencyService } from '@/applications/task-dependency/task-dependency.service';
import { TaskStatus as TaskStatusType } from '@/types/wbs';
import { DependencyType } from '@/domains/task-dependency/task-dependency';
import {
  schedule as runDependencyAwareSchedule,
  SchedulableTask,
  DependencyEdge,
  WorkingCalendar,
} from '@/domains/task-scheduling/dependency-aware-scheduler';

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
  // --- 依存関係考慮版の追加情報（ganttv3 表示用・後方互換のため optional） ---
  phaseId?: number;
  phaseName?: string;
  status?: TaskStatusType;
  assigneeSeq?: number;
  /** 進捗率（0-100） */
  progressRate?: number;
  /** リスケ時の扱い: fixed=完了固定 / partial=着手中(終了再計算) / scheduled=前詰め */
  schedulingKind?: "fixed" | "partial" | "scheduled";
  /** このタスクの先行依存（taskId は文字列化前の数値） */
  predecessors?: { taskId: number; type: DependencyType; lag: number }[];
}

/** スケジュール計算モード */
export type ScheduleCalcMode = "plan" | "reschedule";

@injectable()
export class TaskSchedulingApplicationService implements ITaskSchedulingApplicationService {
  constructor(
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository,
    @inject(SYMBOL.IUserScheduleRepository) private userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.IWbsAssigneeRepository) private wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ISystemSettingsRepository) private systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.ITaskDependencyService) private taskDependencyService: TaskDependencyService,
    @inject(SYMBOL.ICompanyHolidayRepository) private companyHolidayRepository: ICompanyHolidayRepository,
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
   * WBSのタスクスケジュールを「タスク依存関係（FS/SS/FF/SF + lag）」を考慮して計算する。
   * - 稼働カレンダー（会社休日・個人予定・稼働率）と依存関係を考慮した前詰め。
   * - 実績は考慮せず、アンカー日から全タスクを再計算する。
   * - DB保存はしない（呼び出し側で表示・TSV出力に使う）。
   * @param wbsId WBS ID
   * @param anchorDate 前詰めの起点（省略時はプロジェクト開始日）
   * @param mode plan=全タスク前詰め / reschedule=完了は固定・着手中は終了のみ再計算
   */
  async calculateWbsTaskSchedulesWithDependencies(
    wbsId: number,
    anchorDate?: Date,
    mode: ScheduleCalcMode = "plan",
  ): Promise<TaskSchedulingResult[]> {
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

    const anchor = this.startOfDay(anchorDate ?? projectStartDate);

    // データ取得
    const tasks = await this.taskRepository.findByWbsId(wbsId);
    const dependencies =
      await this.taskDependencyService.getDependenciesByWbsId(wbsId);
    const systemSettings = await this.systemSettingsRepository.get();
    const standardWorkingHours = systemSettings.standardWorkingHours;
    // 会社休日を反映（旧メソッドは空配列で未反映だったのをここで修正）
    const holidays = await this.companyHolidayRepository.findAll();
    const companyCalendar = new CompanyCalendar(standardWorkingHours, holidays);

    // 担当者ごとの稼働カレンダーを事前構築（N+1回避）
    const assigneeIds = Array.from(
      new Set(
        tasks
          .map((t) => t.assigneeId)
          .filter((id): id is number => id != null),
      ),
    );
    const calendarById = new Map<number, AssigneeWorkingCalendar>();
    const assigneeSeqById = new Map<number, number>();
    for (const assigneeId of assigneeIds) {
      const assignee = await this.wbsAssigneeRepository.findById(assigneeId);
      if (!assignee) continue;
      const userSchedules = await this.userScheduleRepository.findByUserId(
        assignee.userId,
      );
      calendarById.set(
        assigneeId,
        new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules),
      );
      assigneeSeqById.set(assigneeId, assignee.seq);
    }

    // スケジューラ入力へ変換（reschedule 時は status/実績からモードを決定）
    const kindByTask = new Map<number, "fixed" | "partial" | "scheduled">();
    const schedulableTasks: SchedulableTask[] = tasks
      .filter((t) => t.id != null)
      .map((t): SchedulableTask => {
        const id = t.id!;
        const base: SchedulableTask = {
          taskId: id,
          taskNo: t.taskNo.getValue(),
          assigneeId: t.assigneeId,
          manHours: t.getYoteiKosus(),
        };

        if (mode !== "reschedule") {
          kindByTask.set(id, "scheduled");
          return base;
        }

        const status = t.getStatus();
        if (status === "COMPLETED") {
          // 完了: 実績（無ければ予定）で固定し、再計算しない
          const fixedStart = t.getJissekiStart() ?? t.getYoteiStart() ?? anchor;
          const fixedEnd = t.getJissekiEnd() ?? t.getYoteiEnd() ?? fixedStart;
          kindByTask.set(id, "fixed");
          return { ...base, schedulingMode: "FIXED", fixedStart, fixedEnd };
        }
        if (status === "IN_PROGRESS") {
          // 着手中: 開始は実績で固定、残工数をアンカー日から消化して終了を再計算
          const fixedStart = t.getJissekiStart() ?? t.getYoteiStart() ?? anchor;
          kindByTask.set(id, "partial");
          return {
            ...base,
            schedulingMode: "PARTIAL",
            fixedStart,
            remainingHours: this.computeRemainingHours(t),
          };
        }
        // 未着手 / 保留: 通常どおりアンカー日から前詰め
        kindByTask.set(id, "scheduled");
        return base;
      });
    const dependencyEdges: DependencyEdge[] = dependencies.map((d) => ({
      predId: d.predecessorTaskId,
      succId: d.successorTaskId,
      type: d.type,
      lag: d.lag,
    }));

    // 依存関係対応スケジューラを実行
    const scheduleResult = runDependencyAwareSchedule({
      tasks: schedulableTasks,
      dependencies: dependencyEdges,
      anchorDate: anchor,
      calendarOf: (id): WorkingCalendar | undefined => calendarById.get(id),
      standardWorkingHours,
    });

    // 後続タスクID → 先行依存の一覧
    const predecessorsByTask = new Map<
      number,
      { taskId: number; type: DependencyType; lag: number }[]
    >();
    for (const d of dependencies) {
      const list = predecessorsByTask.get(d.successorTaskId) ?? [];
      list.push({ taskId: d.predecessorTaskId, type: d.type, lag: d.lag });
      predecessorsByTask.set(d.successorTaskId, list);
    }

    // DTO へ整形
    return tasks
      .filter((t) => t.id != null)
      .map((t) =>
        this.toSchedulingResult(
          t,
          scheduleResult,
          predecessorsByTask,
          assigneeSeqById,
          kindByTask,
        ),
      );
  }

  /**
   * 着手中タスクの残工数を求める。
   * 実績工数があれば「予定−実績」、無ければ進捗率から、いずれも無ければ予定工数全量。
   */
  private computeRemainingHours(task: Task): number {
    const yotei = task.getYoteiKosus() ?? 0;
    const jisseki = task.getJissekiKosus();
    if (jisseki != null && jisseki > 0) {
      return Math.max(0, yotei - jisseki);
    }
    const progress = task.progressRate;
    if (progress != null && progress > 0) {
      return Math.max(0, yotei * (1 - progress / 100));
    }
    return yotei;
  }

  /** 算出結果（または各種エラー）を TaskSchedulingResult に整形 */
  private toSchedulingResult(
    task: Task,
    scheduleResult: ReturnType<typeof runDependencyAwareSchedule>,
    predecessorsByTask: Map<
      number,
      { taskId: number; type: DependencyType; lag: number }[]
    >,
    assigneeSeqById: Map<number, number>,
    kindByTask: Map<number, "fixed" | "partial" | "scheduled">,
  ): TaskSchedulingResult {
    const id = task.id!;
    const hasAssignee = task.assigneeId != null && task.assignee != null;
    const result: TaskSchedulingResult = {
      taskId: id,
      taskNo: task.taskNo.getValue(),
      taskName: task.name,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.displayName ?? task.assignee?.name,
      assigneeSeq:
        task.assigneeId != null
          ? assigneeSeqById.get(task.assigneeId)
          : undefined,
      plannedManHours: task.getYoteiKosus(),
      hasAssignee,
      phaseId: task.phaseId ?? task.phase?.id,
      phaseName: task.phase?.name,
      status: task.getStatus(),
      progressRate: task.progressRate,
      schedulingKind: kindByTask.get(id),
      predecessors: predecessorsByTask.get(id),
    };

    const range = scheduleResult.scheduled.get(id);
    if (range) {
      result.plannedStartDate = range.start;
      result.plannedEndDate = range.end;
      return result;
    }

    const code = scheduleResult.errors.get(id);
    switch (code) {
      case 'NO_ASSIGNEE':
        result.errorMessage = '担当者が設定されていません';
        break;
      case 'NO_MANHOURS':
        result.errorMessage = '予定工数が設定されていません';
        break;
      case 'CYCLE':
        result.errorMessage = '循環依存を含む経路上にあるため計算できません';
        break;
      case 'CALENDAR_UNAVAILABLE':
        result.errorMessage =
          '稼働可能日が見つからないため計算できません（稼働率・休暇設定を確認してください）';
        break;
      default:
        result.errorMessage = 'スケジュールを計算できませんでした';
        break;
    }
    return result;
  }

  /** ローカルタイムの0時に正規化 */
  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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