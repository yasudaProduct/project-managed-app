import { NotificationEventDetector } from '@/applications/notification/notification-event-detector';
import type { INotificationService } from '@/applications/notification/inotification-service';
import type { INotificationRepository } from '@/applications/notification/inotification-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { ITargetWbsQueryRepository } from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import { withProjectSettingsDefaults } from '@/types/project-settings';
import { NotificationType } from '@/types/notification';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { Assignee } from '@/domains/task/assignee';
import { WorkRecord } from '@/domains/work-record/work-record';
import type { TaskStatus as TaskStatusType } from '@/types/wbs';

/**
 * 通知イベント検知。
 * - 対象は未開始・進行中プロジェクトの最新WBS
 * - 判定は遅延タスク判定（docs/specs/09-task-delay.md）と工数超過判定のドメインロジックを使う
 * - しきい値はプロジェクト設定（deadlineAlertDays / costOverrunThresholdPct）
 * - 宛先はタスク担当者のユーザーID
 * - cronは6時間ごとに動くため、同じタスク・種類の通知は業務日（JST）ごとに1回まで
 */
describe('NotificationEventDetector', () => {
  // JST 2026-10-31 12:00
  const now = new Date('2026-10-31T03:00:00.000Z');

  const makeTask = (args: {
    id: number;
    status: TaskStatusType;
    start: string;
    end: string;
    plannedHours?: number;
    actualHours?: number;
    assigneeUserId?: string | null;
  }): Task =>
    Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(`D1-000${args.id}`),
      wbsId: 1,
      name: `タスク${args.id}`,
      status: new TaskStatus({ status: args.status }),
      assigneeId: args.assigneeUserId === null ? undefined : 70,
      assignee:
        args.assigneeUserId === null
          ? undefined
          : Assignee.createFromDb({
              id: 70,
              name: 'yamada',
              displayName: '山田',
              userId: args.assigneeUserId ?? 'user-1',
            }),
      periods: [
        Period.create({
          startDate: new Date(`${args.start}T00:00:00.000Z`),
          endDate: new Date(`${args.end}T00:00:00.000Z`),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.create({
              kosu: args.plannedHours ?? 10,
              type: new ManHourType({ type: 'NORMAL' }),
            }),
          ],
        }),
      ],
      workRecords:
        args.actualHours !== undefined
          ? [
              WorkRecord.create({
                userId: 'user-1',
                taskId: args.id,
                startDate: new Date('2026-10-20T00:00:00.000Z'),
                endDate: new Date('2026-10-20T00:00:00.000Z'),
                manHours: args.actualHours,
              }),
            ]
          : [],
    });

  let notificationService: { createNotification: jest.Mock };
  let notificationRepository: { findByFilter: jest.Mock };
  let taskRepository: { findActiveByWbsId: jest.Mock };
  let targetWbsQueryRepository: { findTargetWbs: jest.Mock };
  let projectSettingsRepository: { findByProjectId: jest.Mock };
  let detector: NotificationEventDetector;

  beforeEach(() => {
    notificationService = { createNotification: jest.fn().mockResolvedValue(undefined) };
    notificationRepository = {
      findByFilter: jest.fn().mockResolvedValue({ data: [] }),
    };
    taskRepository = { findActiveByWbsId: jest.fn().mockResolvedValue([]) };
    targetWbsQueryRepository = {
      findTargetWbs: jest.fn().mockResolvedValue([
        { wbsId: 1, wbsName: 'WBS-A', projectId: 'p1', projectName: '案件A' },
      ]),
    };
    projectSettingsRepository = {
      findByProjectId: jest
        .fn()
        .mockResolvedValue(
          withProjectSettingsDefaults('p1', { deadlineAlertDays: 2, costOverrunThresholdPct: 100 })
        ),
    };
    detector = new NotificationEventDetector(
      notificationService as unknown as INotificationService,
      notificationRepository as unknown as INotificationRepository,
      taskRepository as unknown as ITaskRepository,
      targetWbsQueryRepository as unknown as ITargetWbsQueryRepository,
      projectSettingsRepository as unknown as IProjectSettingsRepository
    );
  });

  describe('detectTaskDeadlines', () => {
    it('終了遅れは期限超過、期限間近は期限警告として担当者のユーザーIDへ通知する', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-28' }),
        makeTask({ id: 2, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-02' }),
        makeTask({ id: 3, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30' }),
      ]);

      await detector.detectTaskDeadlines(now);

      expect(taskRepository.findActiveByWbsId).toHaveBeenCalledWith(1);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.TASK_DEADLINE_OVERDUE,
          message: '「タスク1」が予定終了日を3日過ぎています',
          data: expect.objectContaining({ taskId: 1, projectId: 'p1', projectName: '案件A' }),
        })
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.TASK_DEADLINE_WARNING,
          message: '「タスク2」の予定終了日が2日後です',
          data: expect.objectContaining({ taskId: 2, daysRemaining: 2 }),
        })
      );
    });

    it('担当者のいないタスクは通知しない', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({
          id: 1,
          status: 'IN_PROGRESS',
          start: '2026-10-01',
          end: '2026-10-28',
          assigneeUserId: null,
        }),
      ]);

      await detector.detectTaskDeadlines(now);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('同じタスク・種類の通知が当日（JST）すでにあれば再送しない', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-28' }),
      ]);
      notificationRepository.findByFilter.mockResolvedValue({ data: [{ data: { taskId: 1 } }] });

      await detector.detectTaskDeadlines(now);

      expect(notificationRepository.findByFilter).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          type: NotificationType.TASK_DEADLINE_OVERDUE,
          // JST 2026-10-31 0:00
          createdAfter: new Date('2026-10-30T15:00:00.000Z'),
        },
        expect.anything()
      );
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('detectScheduleDelays', () => {
    it('予定開始日を過ぎて未着手のタスクを担当者へ通知する', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 4, status: 'NOT_STARTED', start: '2026-10-29', end: '2026-11-20' }),
        makeTask({ id: 5, status: 'IN_PROGRESS', start: '2026-10-29', end: '2026-11-20' }),
      ]);

      await detector.detectScheduleDelays(now);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.SCHEDULE_DELAY,
          message: '「タスク4」が予定開始日を2日過ぎても未着手です',
          data: expect.objectContaining({ taskId: 4, delayDays: 2, projectId: 'p1' }),
        })
      );
    });
  });

  describe('detectManhourExceeded', () => {
    it('プロジェクト設定のしきい値で工数超過・工数警告を通知する', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 6, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30', actualHours: 12 }),
        makeTask({ id: 7, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30', actualHours: 8.5 }),
        makeTask({ id: 8, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30', actualHours: 3 }),
        makeTask({ id: 9, status: 'COMPLETED', start: '2026-10-01', end: '2026-11-30', actualHours: 20 }),
      ]);

      await detector.detectManhourExceeded(now);

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.TASK_MANHOUR_EXCEEDED,
          data: expect.objectContaining({
            taskId: 6,
            actualHours: 12,
            plannedHours: 10,
            percentage: 120,
          }),
        })
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.TASK_MANHOUR_WARNING,
          data: expect.objectContaining({ taskId: 7, percentage: 85 }),
        })
      );
    });

    it('プロジェクト設定が未作成でも既定値（100%）で判定する', async () => {
      projectSettingsRepository.findByProjectId.mockResolvedValue(null);
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 6, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30', actualHours: 10 }),
      ]);

      await detector.detectManhourExceeded(now);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.TASK_MANHOUR_EXCEEDED })
      );
    });
  });

  it('1件の通知作成に失敗しても残りの通知は作成する', async () => {
    taskRepository.findActiveByWbsId.mockResolvedValue([
      makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-28' }),
      makeTask({ id: 2, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-27' }),
    ]);
    notificationService.createNotification
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await detector.detectTaskDeadlines(now);

    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
