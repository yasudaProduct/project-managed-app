import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { ISchedulingApplicationService } from '@/applications/task-scheduling/ischeduling-application-service';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { ITaskDependencyRepository } from '@/applications/task-dependency/itask-dependency-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { TaskDependency } from '@/domains/task-dependency/task-dependency';
import { cleanupTestData, seedTestProject, testIds } from '../../helpers';

/**
 * テストローカルのID管理
 */
const localIds = {
  assignee1Id: 0,
  assignee2Id: 0,
  user1Id: 'scheduling-app-user-001',
  user2Id: 'scheduling-app-user-002',
  taskAId: 0,
  taskBId: 0,
  taskIds: [] as number[],
};

// 2026-06-15(月)は日本の祝日が無い週。CUSTOM基準日として使い、日付計算を決定的にする。
const BASELINE_ISO = '2026-06-15T00:00:00.000Z';

const makeTask = (
  no: number,
  name: string,
  assigneeId: number,
  kosu: number,
  overrides: {
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    startDate?: Date;
    endDate?: Date;
  } = {}
) =>
  Task.create({
    taskNo: TaskNo.create('SC', no),
    wbsId: testIds.wbsId,
    name,
    phaseId: testIds.phaseId,
    assigneeId,
    status: new TaskStatus({ status: overrides.status ?? 'NOT_STARTED' }),
    periods: [
      Period.create({
        startDate: overrides.startDate ?? new Date('2025-05-10'),
        endDate: overrides.endDate ?? new Date('2025-05-20'),
        type: new PeriodType({ type: 'YOTEI' }),
        manHours: [ManHour.create({ kosu, type: new ManHourType({ type: 'NORMAL' }) })],
      }),
    ],
  });

describe('SchedulingApplicationService Integration Tests', () => {
  let schedulingService: ISchedulingApplicationService;
  let taskRepository: ITaskRepository;
  let taskDependencyRepository: ITaskDependencyRepository;
  let wbsAssigneeRepository: IWbsAssigneeRepository;

  beforeAll(async () => {
    schedulingService = container.get<ISchedulingApplicationService>(
      SYMBOL.ISchedulingApplicationService
    );
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
    taskDependencyRepository = container.get<ITaskDependencyRepository>(
      SYMBOL.ITaskDependencyRepository
    );
    wbsAssigneeRepository = container.get<IWbsAssigneeRepository>(
      SYMBOL.IWbsAssigneeRepository
    );

    // システム設定(1日の標準稼働時間)は他の結合テストスイートとも共有されるグローバルな
    // シングルトン行のため、ここでは変更しない(既定値 7.5h/日 のまま計算する)。

    await global.prisma.users.upsert({
      where: { id: localIds.user1Id },
      update: {},
      create: {
        id: localIds.user1Id,
        email: 'sched-app-user001@example.com',
        name: '担当者1',
        displayName: '担当者1',
      },
    });
    await global.prisma.users.upsert({
      where: { id: localIds.user2Id },
      update: {},
      create: {
        id: localIds.user2Id,
        email: 'sched-app-user002@example.com',
        name: '担当者2',
        displayName: '担当者2',
      },
    });

    await seedTestProject(global.prisma);

    const assignee1 = await wbsAssigneeRepository.create(
      testIds.wbsId,
      WbsAssignee.create({ wbsId: testIds.wbsId, userId: localIds.user1Id, rate: 1.0, seq: 1 })
    );
    const assignee2 = await wbsAssigneeRepository.create(
      testIds.wbsId,
      WbsAssignee.create({ wbsId: testIds.wbsId, userId: localIds.user2Id, rate: 1.0, seq: 2 })
    );
    localIds.assignee1Id = assignee1.id!;
    localIds.assignee2Id = assignee2.id!;
  });

  afterAll(async () => {
    // task_dependencies は WbsTask 削除で cascade 削除されるため、タスク→担当者の順に削除する
    for (const taskId of localIds.taskIds) {
      await global.prisma.wbsTask.delete({ where: { id: taskId } }).catch(() => {});
    }
    await global.prisma.wbsAssignee
      .delete({ where: { id: localIds.assignee1Id } })
      .catch(() => {});
    await global.prisma.wbsAssignee
      .delete({ where: { id: localIds.assignee2Id } })
      .catch(() => {});
    // project_settings は project 削除で cascade 削除される
    await cleanupTestData(global.prisma);
  });

  describe('calculateSchedule', () => {
    it('FS依存を持つタスクを実データから前詰め計算し、後続タスクが先行終了の翌営業日から開始する', async () => {
      // 標準稼働時間は既定値7.5h/日。15h=2日、7.5h=1日ちょうど消化する工数にして計算を決定的にする。
      const t1 = await taskRepository.create(makeTask(1, 'タスクA', localIds.assignee1Id, 15));
      const t2 = await taskRepository.create(makeTask(2, 'タスクB', localIds.assignee2Id, 7.5));
      localIds.taskAId = t1.id!;
      localIds.taskBId = t2.id!;
      localIds.taskIds.push(t1.id!, t2.id!);

      await taskDependencyRepository.create(
        TaskDependency.create({
          predecessorTaskId: t1.id!,
          successorTaskId: t2.id!,
          wbsId: testIds.wbsId,
          type: 'FS',
          lag: 0,
        })
      );

      const result = await schedulingService.calculateSchedule(testIds.wbsId, {
        baselineMode: 'CUSTOM',
        baselineDateIso: BASELINE_ISO,
      });

      const dtoA = result.scheduledTasks.find((t) => t.taskId === t1.id)!;
      const dtoB = result.scheduledTasks.find((t) => t.taskId === t2.id)!;

      // 15h/7.5h = 2日 → 06-15(月),06-16(火)で終了
      expect(dtoA.scheduledStartDate).toBe('2026-06-15T00:00:00.000Z');
      expect(dtoA.scheduledEndDate).toBe('2026-06-16T00:00:00.000Z');
      // FS依存: 先行終了(06-16)の翌営業日 06-17(水) から
      expect(dtoB.scheduledStartDate).toBe('2026-06-17T00:00:00.000Z');
      expect(dtoB.scheduledEndDate).toBe('2026-06-17T00:00:00.000Z');
      expect(dtoB.note).toBe('NORMAL');
      expect(dtoB.predecessors).toEqual([
        { taskId: t1.id, type: 'FS', lag: 0 },
      ]);
    });

    it('project_settingsに保存されたsteadyTaskKeywordsが実際の計算に反映される(定常タスクは前詰めしない)', async () => {
      await global.prisma.projectSettings.upsert({
        where: { projectId: testIds.projectId },
        update: { schedulingSettings: { steadyTaskKeywords: ['進捗管理'] } },
        create: {
          projectId: testIds.projectId,
          schedulingSettings: { steadyTaskKeywords: ['進捗管理'] },
        },
      });

      const steadyTask = await taskRepository.create(
        makeTask(10, '進捗管理', localIds.assignee1Id, 20, {
          // 06-20(土)〜06-24(水)。非稼働日始まりでも入力期間のまま採用されるはず
          startDate: new Date('2026-06-20'),
          endDate: new Date('2026-06-24'),
        })
      );
      localIds.taskIds.push(steadyTask.id!);

      const result = await schedulingService.calculateSchedule(testIds.wbsId, {
        baselineMode: 'CUSTOM',
        baselineDateIso: BASELINE_ISO,
      });

      const dto = result.scheduledTasks.find((t) => t.taskId === steadyTask.id)!;
      expect(dto.isSteady).toBe(true);
      expect(dto.note).toBe('STEADY_FIXED_PERIOD');
      expect(dto.scheduledStartDate).toBe('2026-06-20T00:00:00.000Z');
      expect(dto.scheduledEndDate).toBe('2026-06-24T00:00:00.000Z');
    });

    it('存在しないWBSの場合はエラーを投げる', async () => {
      await expect(
        schedulingService.calculateSchedule(999999999, { baselineMode: 'TODAY' })
      ).rejects.toThrow('WBSが見つかりません');
    });

    it('baselineMode=PROJECT_STARTの場合はプロジェクトの開始日が基準日として採用される', async () => {
      const result = await schedulingService.calculateSchedule(testIds.wbsId, {
        baselineMode: 'PROJECT_START',
      });
      // seedTestProject は startDate: 2025-05-01 でプロジェクトを作成する
      expect(result.baselineDate).toBe(new Date('2025-05-01').toISOString());
    });
  });

  describe('recalculatePreview', () => {
    it('手動調整後のタスクから負荷とTSVのみ再計算し、DBへは書き込まない(読み取り専用)', async () => {
      const before = await global.prisma.wbsTask.findMany({
        where: { id: { in: localIds.taskIds } },
        orderBy: { id: 'asc' },
      });

      const calcResult = await schedulingService.calculateSchedule(testIds.wbsId, {
        baselineMode: 'CUSTOM',
        baselineDateIso: BASELINE_ISO,
      });

      // 画面上でタスクAの終了日を1日後ろへ手動調整したと仮定する
      const adjusted = calcResult.scheduledTasks.map((t) =>
        t.taskId === localIds.taskAId
          ? { ...t, scheduledEndDate: '2026-06-17T00:00:00.000Z' }
          : t
      );

      const preview = await schedulingService.recalculatePreview(testIds.wbsId, {
        baselineDateIso: calcResult.baselineDate,
        scheduledTasks: adjusted,
      });

      expect(preview.tsv).toContain('タスクA');
      expect(preview.workloads.length).toBeGreaterThan(0);

      const after = await global.prisma.wbsTask.findMany({
        where: { id: { in: localIds.taskIds } },
        orderBy: { id: 'asc' },
      });
      // タスクのDBレコードが一切変更されていないこと（再スケジュール・書き込みをしない）
      expect(after).toEqual(before);
    });

    it('存在しないWBSの場合はエラーを投げる', async () => {
      await expect(
        schedulingService.recalculatePreview(999999999, {
          baselineDateIso: BASELINE_ISO,
          scheduledTasks: [],
        })
      ).rejects.toThrow('WBSが見つかりません');
    });

    it('基準日が不正な文字列の場合はエラーを投げる', async () => {
      await expect(
        schedulingService.recalculatePreview(testIds.wbsId, {
          baselineDateIso: 'invalid-date',
          scheduledTasks: [],
        })
      ).rejects.toThrow('基準日が不正です');
    });
  });
});
