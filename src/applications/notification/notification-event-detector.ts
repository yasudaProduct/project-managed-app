import { injectable, inject } from 'inversify';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import type { INotificationService } from './inotification-service';
import type { INotificationRepository } from './inotification-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type {
  ITargetWbsQueryRepository,
  TargetWbsInfo,
} from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import { withProjectSettingsDefaults, type ProjectSettingsData } from '@/types/project-settings';
import { calendarDateInTimeZone, startOfDayInTimeZone } from '@/utils/date-util';
import { detectTaskDelay, type TaskDelay } from '@/domains/task/task-delay';
import { detectManhourOverrun, type ManhourOverrun } from '@/domains/task/task-manhour-overrun';
import type { Task } from '@/domains/task/task';
import { SYMBOL } from '@/types/symbol';

/** 1件の通知の元になるタスクと、その所属（プロジェクト・WBS） */
type TaskContext = {
  task: Task;
  target: TargetWbsInfo;
  settings: ProjectSettingsData;
};

/** 宛先・チャネルを除いた通知の中身 */
type NotificationDraft = {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: {
    taskId: number;
    taskNo: string;
    projectId: string;
    projectName: string;
    wbsId: number;
    [key: string]: unknown;
  };
};

/** 同じ宛先・種類の通知済みタスクIDの取得上限（1日に1宛先へ出る件数としては十分大きい値） */
const NOTIFIED_LOOKUP_LIMIT = 1000;

/**
 * 通知イベント検知クラス
 * タスク期限、工数超過、スケジュール遅延（開始遅れ）を検知して担当者へ通知を作成する。
 *
 * - 対象は未開始・進行中プロジェクトの最新WBS（担当者負荷の横断集計と同じ対象）
 * - 判定は遅延タスク判定（docs/specs/09-task-delay.md）・工数超過判定のドメインロジックを使い、
 *   しきい値はプロジェクト設定（deadlineAlertDays / costOverrunThresholdPct）に従う
 * - cron は6時間ごとに動くため、同じタスク・種類の通知は業務日（JST）ごとに1回までとする
 */
@injectable()
export class NotificationEventDetector {
  constructor(
    @inject(SYMBOL.INotificationService) private notificationService: INotificationService,
    @inject(SYMBOL.INotificationRepository) private notificationRepository: INotificationRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.ITargetWbsQueryRepository) private targetWbsQueryRepository: ITargetWbsQueryRepository,
    @inject(SYMBOL.IProjectSettingsRepository) private projectSettingsRepository: IProjectSettingsRepository
  ) { }

  /**
   * タスク期限の検知と通知作成（終了遅れ＝期限超過、期限間近＝期限警告）
   */
  async detectTaskDeadlines(now: Date = new Date()): Promise<void> {
    try {
      const today = calendarDateInTimeZone(now);
      await this.notifyEach(now, (context) => {
        const delay = this.detectDelay(context, today);
        if (delay?.kind === 'END_OVERDUE') {
          return this.buildDeadlineNotification(context, delay, true);
        }
        if (delay?.kind === 'DUE_SOON') {
          return this.buildDeadlineNotification(context, delay, false);
        }
        return null;
      });
    } catch (error) {
      console.error('Error in detectTaskDeadlines:', error);
      throw error;
    }
  }

  /**
   * 工数超過の検知と通知作成
   */
  async detectManhourExceeded(now: Date = new Date()): Promise<void> {
    try {
      await this.notifyEach(now, (context) => {
        const overrun = detectManhourOverrun(
          {
            status: context.task.getStatus(),
            plannedHours: context.task.getYoteiKosus() ?? 0,
            actualHours: context.task.getJissekiKosus() ?? 0,
          },
          context.settings.costOverrunThresholdPct
        );
        return overrun ? this.buildManhourNotification(context, overrun) : null;
      });
    } catch (error) {
      console.error('Error in detectManhourExceeded:', error);
      throw error;
    }
  }

  /**
   * スケジュール遅延（予定開始日を過ぎて未着手）の検知と通知作成
   */
  async detectScheduleDelays(now: Date = new Date()): Promise<void> {
    try {
      const today = calendarDateInTimeZone(now);
      await this.notifyEach(now, (context) => {
        const delay = this.detectDelay(context, today);
        return delay?.kind === 'START_OVERDUE'
          ? this.buildStartDelayNotification(context, delay)
          : null;
      });
    } catch (error) {
      console.error('Error in detectScheduleDelays:', error);
      throw error;
    }
  }

  // プライベートメソッド

  /**
   * 対象WBSの全タスクについて通知を組み立て、当日未通知のものだけ作成する。
   * 1件の作成失敗で残りを止めないよう、作成は件ごとに例外を捕捉する。
   */
  private async notifyEach(
    now: Date,
    build: (context: TaskContext) => NotificationDraft | null
  ): Promise<void> {
    const notifiedTaskIds = new Map<string, Promise<Set<number>>>();
    const since = startOfDayInTimeZone(now);

    for (const context of await this.loadTaskContexts()) {
      const draft = build(context);
      if (!draft) continue;

      const userId = context.task.assignee?.userId;
      if (!userId) continue;

      const key = `${userId}:${draft.type}`;
      if (!notifiedTaskIds.has(key)) {
        notifiedTaskIds.set(key, this.findNotifiedTaskIds(userId, draft.type, since));
      }
      const notified = await notifiedTaskIds.get(key)!;
      if (notified.has(draft.data.taskId)) continue;

      try {
        await this.notificationService.createNotification({
          ...draft,
          userId,
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        });
        notified.add(draft.data.taskId);
      } catch (error) {
        console.error(`Failed to create notification for task ${draft.data.taskNo}:`, error);
      }
    }
  }

  private async loadTaskContexts(): Promise<TaskContext[]> {
    const contexts: TaskContext[] = [];
    for (const target of await this.targetWbsQueryRepository.findTargetWbs()) {
      const settings = withProjectSettingsDefaults(
        target.projectId,
        await this.projectSettingsRepository.findByProjectId(target.projectId)
      );
      const tasks = await this.taskRepository.findActiveByWbsId(target.wbsId);
      for (const task of tasks) {
        if (task.id === undefined) continue;
        contexts.push({ task, target, settings });
      }
    }
    return contexts;
  }

  private async findNotifiedTaskIds(
    userId: string,
    type: NotificationType,
    since: Date
  ): Promise<Set<number>> {
    const result = await this.notificationRepository.findByFilter(
      { userId, type, createdAfter: since },
      { page: 1, limit: NOTIFIED_LOOKUP_LIMIT }
    );
    const taskIds = result.data
      .map((notification) => notification.data?.taskId)
      .filter((taskId): taskId is number => typeof taskId === 'number');
    return new Set(taskIds);
  }

  private detectDelay(context: TaskContext, today: Date): TaskDelay | null {
    return detectTaskDelay(
      {
        status: context.task.getStatus(),
        plannedStart: context.task.getYoteiStart() ?? null,
        plannedEnd: context.task.getYoteiEnd() ?? null,
      },
      today,
      context.settings.deadlineAlertDays
    );
  }

  private baseData(context: TaskContext) {
    return {
      taskId: context.task.id!,
      taskNo: context.task.taskNo.getValue(),
      projectId: context.target.projectId,
      projectName: context.target.projectName,
      wbsId: context.target.wbsId,
    };
  }

  private buildDeadlineNotification(
    context: TaskContext,
    delay: TaskDelay,
    isOverdue: boolean
  ): NotificationDraft {
    const name = context.task.name;
    return {
      type: isOverdue
        ? NotificationType.TASK_DEADLINE_OVERDUE
        : NotificationType.TASK_DEADLINE_WARNING,
      priority: isOverdue ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      title: isOverdue ? 'タスク期限超過' : 'タスク期限警告',
      message: isOverdue
        ? `「${name}」が予定終了日を${delay.days}日過ぎています`
        : `「${name}」の予定終了日が${delay.days === 0 ? '今日' : `${delay.days}日後`}です`,
      data: {
        ...this.baseData(context),
        daysRemaining: isOverdue ? -delay.days : delay.days,
        isOverdue,
      },
    };
  }

  private buildStartDelayNotification(context: TaskContext, delay: TaskDelay): NotificationDraft {
    return {
      type: NotificationType.SCHEDULE_DELAY,
      priority: NotificationPriority.HIGH,
      title: 'タスク開始遅れ',
      message: `「${context.task.name}」が予定開始日を${delay.days}日過ぎても未着手です`,
      data: {
        ...this.baseData(context),
        delayDays: delay.days,
      },
    };
  }

  private buildManhourNotification(
    context: TaskContext,
    overrun: ManhourOverrun
  ): NotificationDraft {
    const isExceeded = overrun.level === 'EXCEEDED';
    return {
      type: isExceeded
        ? NotificationType.TASK_MANHOUR_EXCEEDED
        : NotificationType.TASK_MANHOUR_WARNING,
      priority: overrun.percentage >= 120 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      title: isExceeded ? '工数超過' : '工数警告',
      message: `「${context.task.name}」の実績工数が予定の${overrun.percentage}%に達しました`,
      data: {
        ...this.baseData(context),
        actualHours: context.task.getJissekiKosus() ?? 0,
        plannedHours: context.task.getYoteiKosus() ?? 0,
        percentage: overrun.percentage,
      },
    };
  }
}

