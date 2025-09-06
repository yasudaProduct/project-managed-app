import { injectable, inject } from 'inversify';
import { NotificationType } from '@/domains/notification/notification-type';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';
import type { INotificationService } from './INotificationService';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IProjectRepository } from '@/applications/projects/iproject-repository';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import { SYMBOL } from '@/types/symbol';

export interface TaskDeadlineInfo {
  id: number;
  taskNo: string;
  name: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeUserId?: string;
  projectId: string;
  projectName: string;
  endDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
}

export interface ManhourInfo {
  id: number;
  taskNo: string;
  name: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeUserId?: string;
  projectId: string;
  projectName: string;
  plannedHours: number;
  actualHours: number;
  percentage: number;
}

export interface ScheduleDelayInfo {
  projectId: string;
  projectName: string;
  projectManagerId?: string;
  delayedTaskCount: number;
  criticalDelayDays: number;
  delayedTasks: Array<{
    id: number;
    name: string;
    daysDelayed: number;
    assigneeName?: string;
  }>;
}

/**
 * 通知イベント検知クラス
 * タスク期限、工数超過、スケジュール遅延を検知して通知を作成します
 */
@injectable()
export class NotificationEventDetector {
  constructor(
    @inject('NotificationService') private notificationService: INotificationService,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository,
    @inject(SYMBOL.IUserRepository) private userRepository: IUserRepository
  ) { }

  /**
   * タスク期限の検知と通知作成
   */
  async detectTaskDeadlines(): Promise<void> {
    console.log('Starting task deadline detection...');

    try {
      const upcomingTasks = await this.getUpcomingDeadlineTasks();
      const overdueTasks = await this.getOverdueTasks();

      // 期限前の通知
      for (const task of upcomingTasks) {
        await this.createDeadlineNotification(task, false);
      }

      // 期限超過の通知
      for (const task of overdueTasks) {
        await this.createDeadlineNotification(task, true);
      }

      console.log(`Task deadline detection completed: ${upcomingTasks.length} upcoming, ${overdueTasks.length} overdue`);
    } catch (error) {
      console.error('Error in detectTaskDeadlines:', error);
      throw error;
    }
  }

  /**
   * 工数超過の検知と通知作成
   */
  async detectManhourExceeded(): Promise<void> {
    console.log('Starting manhour exceeded detection...');

    try {
      const manhourInfos = await this.getManhourExceededTasks();

      for (const info of manhourInfos) {
        await this.createManhourNotification(info);
      }

      console.log(`Manhour exceeded detection completed: ${manhourInfos.length} tasks`);
    } catch (error) {
      console.error('Error in detectManhourExceeded:', error);
      throw error;
    }
  }

  /**
   * スケジュール遅延の検知と通知作成
   */
  async detectScheduleDelays(): Promise<void> {
    console.log('Starting schedule delay detection...');

    try {
      const delayInfos = await this.getScheduleDelayInfo();

      for (const info of delayInfos) {
        await this.createScheduleDelayNotification(info);
      }

      console.log(`Schedule delay detection completed: ${delayInfos.length} projects`);
    } catch (error) {
      console.error('Error in detectScheduleDelays:', error);
      throw error;
    }
  }

  // プライベートメソッド

  private async getUpcomingDeadlineTasks(): Promise<TaskDeadlineInfo[]> {
    // 今日から7日後までのタスクを取得
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    // TODO: 仮の実装 Taskドメインにメソッド生やしてもいいかも
    const tasks = await this.taskRepository.findTasksByPeriod(startDate, endDate);

    const taskInfos: TaskDeadlineInfo[] = [];

    for (const task of tasks) {
      if (!task.periods || task.periods.length === 0) continue;

      // 最新の期間の終了日を取得
      const latestPeriod = task.periods.sort((a, b) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      )[0];

      const endDate = new Date(latestPeriod.endDate);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 0〜7日以内の期限のタスクのみ
      if (daysRemaining >= 0 && daysRemaining <= 7) {
        taskInfos.push({
          id: task.id!,
          taskNo: task.taskNo.getValue(),
          name: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.name,
          assigneeUserId: task.assignee?.id!.toString(),
          projectId: "1", // TODO: 修正要
          projectName: '', // プロジェクト名は別途取得が必要
          endDate,
          daysRemaining,
          isOverdue: false,
        });
      }
    }

    return taskInfos;
  }

  private async getOverdueTasks(): Promise<TaskDeadlineInfo[]> {
    const now = new Date();

    // 期限が過ぎているタスクを取得
    // const tasks = await this.taskRepository.findOverdueTasks(now);
    const tasks = await this.taskRepository.findTasksByPeriod(now, now); // TODO: 仮

    const taskInfos: TaskDeadlineInfo[] = [];

    for (const task of tasks) {
      if (!task.periods || task.periods.length === 0) continue;

      const latestPeriod = task.periods.sort((a, b) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      )[0];

      const endDate = new Date(latestPeriod.endDate);
      const daysOverdue = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 0) {
        taskInfos.push({
          id: task.id!,
          taskNo: task.taskNo.getValue(),
          name: task.name,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee?.name,
          assigneeUserId: task.assignee?.id!.toString(),
          projectId: "1", // TODO: 修正要
          projectName: '',
          endDate,
          daysRemaining: -daysOverdue,
          isOverdue: true,
        });
      }
    }

    return taskInfos;
  }

  private async getManhourExceededTasks(): Promise<ManhourInfo[]> {
    // 進行中のタスクで工数実績があるものを取得
    // const tasks = await this.taskRepository.findActiveTasksWithWorkRecords();
    const tasks = await this.taskRepository.findAll(); // TODO: 仮

    const manhourInfos: ManhourInfo[] = [];

    for (const task of tasks) {
      if (!task.workRecords || task.workRecords.length === 0) continue;

      // 実績工数を計算
      const actualHours = task.workRecords.reduce(
        // (sum, record) =>
        () =>
          // sum + parseFloat(record.hoursWorked.toString()), 0  一旦コメント
          50, 0// TODO: 仮
      );

      // 予定工数を取得 (仮の実装)
      // TODO: 実際のタスクの工数取得ロジックに合わせる
      const plannedHours = 40; // 仮の値

      if (plannedHours > 0) {
        const percentage = (actualHours / plannedHours) * 100;

        // 80%以上の場合に通知対象
        if (percentage >= 80) {
          manhourInfos.push({
            id: task.id!,
            taskNo: task.taskNo.getValue(),
            name: task.name,
            assigneeId: task.assigneeId,
            assigneeName: task.assignee?.name,
            assigneeUserId: task.assignee?.id!.toString(),
            projectId: "1", // TODO: 修正要
            projectName: '',
            plannedHours,
            actualHours,
            percentage: Math.round(percentage),
          });
        }
      }
    }

    return manhourInfos;
  }

  private async getScheduleDelayInfo(): Promise<ScheduleDelayInfo[]> {
    // アクティブなプロジェクトを取得
    // const projects = await this.projectRepository.findActiveProjects();
    const projects = await this.projectRepository.findAll(); // TODO: 仮

    const delayInfos: ScheduleDelayInfo[] = [];

    for (const project of projects) {
      const delayedTasks = await this.taskRepository.findAll(); // TODO: 仮
      // const delayedTasks = await this.taskRepository.findDelayedTasksByProject(project.id);

      if (delayedTasks.length > 0) {
        const criticalDelayDays = Math.max(...delayedTasks.map(() => {
          // 遅延日数の計算 (仮の実装)
          return 5; // 仮の値
        }));

        delayInfos.push({
          projectId: project.id!,
          projectName: project.name,
          projectManagerId: undefined, // プロジェクトマネージャーID (実装が必要)
          delayedTaskCount: delayedTasks.length,
          criticalDelayDays,
          delayedTasks: delayedTasks.map(task => ({
            id: task.id!,
            name: task.name,
            daysDelayed: 5, // 仮の値
            assigneeName: task.assignee?.name,
          })),
        });
      }
    }

    return delayInfos;
  }

  private async createDeadlineNotification(task: TaskDeadlineInfo, isOverdue: boolean): Promise<void> {
    if (!task.assigneeUserId) {
      console.warn(`Task ${task.taskNo} has no assignee user ID, skipping notification`);
      return;
    }

    const type = isOverdue ? NotificationType.TASK_DEADLINE_OVERDUE : NotificationType.TASK_DEADLINE_WARNING;
    const priority = isOverdue ? NotificationPriority.URGENT : NotificationPriority.HIGH;

    const title = isOverdue
      ? 'タスク期限超過'
      : 'タスク期限警告';

    const message = isOverdue
      ? `「${task.name}」が期限を${Math.abs(task.daysRemaining)}日超過しています`
      : `「${task.name}」の期限が${task.daysRemaining === 0 ? '今日' : `${task.daysRemaining}日後`}です`;

    await this.notificationService.createNotification({
      userId: task.assigneeUserId,
      type,
      priority,
      title,
      message,
      data: {
        taskId: task.id,
        taskNo: task.taskNo,
        projectId: task.projectId,
        projectName: task.projectName,
        daysRemaining: task.daysRemaining,
        isOverdue,
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    });
  }

  private async createManhourNotification(info: ManhourInfo): Promise<void> {
    if (!info.assigneeUserId) {
      console.warn(`Task ${info.taskNo} has no assignee user ID, skipping notification`);
      return;
    }

    const type = info.percentage >= 100
      ? NotificationType.TASK_MANHOUR_EXCEEDED
      : NotificationType.TASK_MANHOUR_WARNING;

    const priority = info.percentage >= 120
      ? NotificationPriority.URGENT
      : NotificationPriority.HIGH;

    const title = info.percentage >= 100 ? '工数超過' : '工数警告';
    const message = `「${info.name}」の実績工数が予定の${info.percentage}%に達しました`;

    await this.notificationService.createNotification({
      userId: info.assigneeUserId,
      type,
      priority,
      title,
      message,
      data: {
        taskId: info.id,
        taskNo: info.taskNo,
        projectId: info.projectId,
        projectName: info.projectName,
        actualHours: info.actualHours,
        plannedHours: info.plannedHours,
        percentage: info.percentage,
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    });
  }

  private async createScheduleDelayNotification(info: ScheduleDelayInfo): Promise<void> {
    // プロジェクトマネージャーまたは関係者に通知
    // TODO: プロジェクトマネージャーの特定ロジックを実装
    const managerId = info.projectManagerId || 'system-admin'; // 仮のID

    await this.notificationService.createNotification({
      userId: managerId,
      type: NotificationType.SCHEDULE_DELAY,
      priority: NotificationPriority.HIGH,
      title: 'スケジュール遅延検知',
      message: `プロジェクト「${info.projectName}」で${info.delayedTaskCount}件のタスクが遅延しています`,
      data: {
        projectId: info.projectId,
        projectName: info.projectName,
        delayedTaskCount: info.delayedTaskCount,
        criticalDelayDays: info.criticalDelayDays,
        delayedTasks: info.delayedTasks,
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    });
  }

  private calculateDaysUntilDeadline(endDate: Date): number {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // private calculateDelayDays(task: any): number {
  private calculateDelayDays(): number {
    // 遅延日数の計算ロジック (仮の実装)
    // TODO: 実際のビジネスロジックに合わせる
    return 5;
  }
}