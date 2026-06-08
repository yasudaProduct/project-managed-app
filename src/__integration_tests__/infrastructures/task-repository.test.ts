// filepath: /Users/yuta/Develop/project-managed-app/src/__integration_tests__/infrastructures/task-repository.test.ts
import { TaskRepository } from '@/infrastructures/task-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';
import type { TaskProgressSnapshotInput } from '@/applications/task/itask-repository';

describe('TaskRepository Integration Tests', () => {
  let taskRepository: TaskRepository;
  let testTaskNo: string;
  let testTaskDbId: number;

  beforeAll(async () => {
    // リポジトリインスタンスの作成
    taskRepository = new TaskRepository();

    // テストデータの準備（プロジェクト、WBS、フェーズを作成）
    await seedTestProject(global.prisma);
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await cleanupTestData(global.prisma);
  });

  describe('タスクのCRUD操作', () => {
    it('タスクを作成できること', async () => {
      // テスト用のタスクを作成
      const taskId = TaskNo.reconstruct(`TEST-${Date.now() % 1000}`);
      testTaskNo = taskId.getValue();

      const task = Task.create({
        taskNo: taskId,
        wbsId: testIds.wbsId,
        name: '結合テスト用タスク',
        phaseId: testIds.phaseId,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-10'),
            endDate: new Date('2025-05-20'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({
                kosu: 10,
                type: new ManHourType({ type: 'NORMAL' })
              })
            ]
          })
        ]
      });

      // リポジトリを使用してタスクを作成
      const createdTask = await taskRepository.create(task);
      testTaskDbId = createdTask.id!;
      testIds.taskId = testTaskDbId;

      // 作成されたタスクを検証
      expect(createdTask).toBeTruthy();
      expect(createdTask.taskNo?.getValue()).toBe(testTaskNo);
      expect(createdTask.name).toBe('結合テスト用タスク');
      expect(createdTask.wbsId).toBe(testIds.wbsId);
      expect(createdTask.phaseId).toBe(testIds.phaseId);
      expect(createdTask.status.getStatus()).toBe('NOT_STARTED');
    });

    it('IDによるタスクの取得', async () => {
      // 先ほど作成したタスクをIDで取得
      const task = await taskRepository.findById(testTaskDbId);

      // 取得したタスクを検証
      expect(task).not.toBeNull();
      expect(task?.taskNo?.getValue()).toBe(testTaskNo);
      expect(task?.name).toBe('結合テスト用タスク');
      expect(task?.wbsId).toBe(testIds.wbsId);
      expect(task?.phaseId).toBe(testIds.phaseId);
      expect(task?.status.getStatus()).toBe('NOT_STARTED');

      // 期間と工数の検証
      expect(task?.periods?.length).toBe(1);
      expect(task?.periods?.[0].type.type).toBe('YOTEI');
      expect(task?.periods?.[0].manHours.length).toBe(1);
      expect(task?.periods?.[0].manHours[0].kosu).toBe(10);
      expect(task?.periods?.[0].manHours[0].type.type).toBe('NORMAL');
    });

    it('すべてのタスクの取得', async () => {
      // 追加のタスクを作成
      const additionalTaskId = TaskNo.reconstruct(`TEST-${Date.now() % 1000}`);
      const additionalTask = Task.create({
        taskNo: additionalTaskId,
        wbsId: testIds.wbsId,
        name: '追加タスク',
        phaseId: testIds.phaseId,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.create({
            startDate: new Date('2025-06-01'),
            endDate: new Date('2025-06-15'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({
                kosu: 20,
                type: new ManHourType({ type: 'NORMAL' })
              })
            ]
          })
        ]
      });

      await taskRepository.create(additionalTask);

      // WBSに紐づくすべてのタスクを取得
      const tasks = await taskRepository.findAll(testIds.wbsId);

      // 少なくとも2つのタスク（初期 + 追加）があることを確認
      expect(tasks.length).toBeGreaterThanOrEqual(2);

      // 最初に作成したタスクが含まれていることを確認
      const originalTask = tasks.find(t => t.taskNo?.getValue() === testTaskNo);
      expect(originalTask).toBeTruthy();
      expect(originalTask?.name).toBe('結合テスト用タスク');

      // 追加したタスクが含まれていることを確認
      const newTask = tasks.find(t => t.taskNo?.getValue() === additionalTaskId.getValue());
      expect(newTask).toBeTruthy();
      expect(newTask?.name).toBe('追加タスク');
      expect(newTask?.status.getStatus()).toBe('IN_PROGRESS');
    });

    it('タスク情報の更新', async () => {
      // 既存のタスクを取得
      const taskToUpdate = await taskRepository.findById(testTaskDbId);
      expect(taskToUpdate).not.toBeNull();

      if (taskToUpdate) {
        // タスク情報を更新
        taskToUpdate.name = '更新されたタスク名';
        taskToUpdate.status = new TaskStatus({ status: 'IN_PROGRESS' });

        // 期間情報を更新
        if (taskToUpdate.periods && taskToUpdate.periods.length > 0) {
          const yoteiPeriod = taskToUpdate.periods[0];
          yoteiPeriod.startDate = new Date('2025-06-01');
          yoteiPeriod.endDate = new Date('2025-06-30');

          // 工数情報を更新
          if (yoteiPeriod.manHours && yoteiPeriod.manHours.length > 0) {
            yoteiPeriod.manHours[0].kosu = 15;
          }
        }

        // リポジトリを使用してタスクを更新
        const updatedTask = await taskRepository.update(testIds.wbsId, taskToUpdate);

        // 更新されたタスクを検証
        expect(updatedTask).toBeTruthy();
        expect(updatedTask.name).toBe('更新されたタスク名');
        expect(updatedTask.status.getStatus()).toBe('IN_PROGRESS');

        // DBが本当に更新されたことを確認
        const refetchedTask = await taskRepository.findById(testTaskDbId);
        expect(refetchedTask?.name).toBe('更新されたタスク名');
        expect(refetchedTask?.status.getStatus()).toBe('IN_PROGRESS');
        // 期間・工数が増殖せず、新しい値で入れ替わっていること
        expect(refetchedTask?.periods?.length).toBe(1);
        expect(refetchedTask?.periods?.[0].manHours.length).toBe(1);
        expect(refetchedTask?.periods?.[0].manHours[0].kosu).toBe(15);
      }
    });

    it('update を2回連続実行しても period/kosu が増殖しないこと', async () => {
      const baseTask = await taskRepository.findById(testTaskDbId);
      expect(baseTask).not.toBeNull();
      if (!baseTask) return;

      // 1回目の更新
      baseTask.name = '2回更新-1';
      await taskRepository.update(testIds.wbsId, baseTask);

      // 2回目の更新（DBから取り直して同じタスクを再更新）
      const reloaded = await taskRepository.findById(testTaskDbId);
      expect(reloaded).not.toBeNull();
      if (!reloaded) return;
      reloaded.name = '2回更新-2';
      await taskRepository.update(testIds.wbsId, reloaded);

      // 2回更新後も period は1件・kosu は1件のまま（重複蓄積していないこと）
      const finalTask = await taskRepository.findById(testTaskDbId);
      expect(finalTask?.name).toBe('2回更新-2');
      expect(finalTask?.periods?.length).toBe(1);
      expect(finalTask?.periods?.[0].manHours.length).toBe(1);

      // DBレベルでも期間・工数の行数が1件ずつであることを確認
      const periodCount = await global.prisma.taskPeriod.count({
        where: { taskId: testTaskDbId },
      });
      expect(periodCount).toBe(1);
      const kosuCount = await global.prisma.taskKosu.count({
        where: { period: { taskId: testTaskDbId } },
      });
      expect(kosuCount).toBe(1);
    });

    it('タスクの削除', async () => {
      // タスクを削除（DB IDを使用）
      await taskRepository.delete(testTaskDbId);

      // 削除されたことを確認
      const deletedTask = await taskRepository.findById(testTaskDbId);
      expect(deletedTask).toBeNull();

      // クリーンアップ処理でエラーが発生しないようにIDをリセット
      testIds.taskId = 0;
    });
  });

  describe('論理削除（soft-delete）フィルタ', () => {
    it('論理削除済みタスクは有効取得から除外され、削除込み取得には現れること', async () => {
      // 専用タスクを作成（他テストと干渉しないよう独立）
      const taskNo = TaskNo.reconstruct(`SOFTDEL-${Date.now() % 100000}`);
      const created = await taskRepository.create(
        Task.create({
          taskNo,
          wbsId: testIds.wbsId,
          name: '論理削除テスト用',
          phaseId: testIds.phaseId,
          status: new TaskStatus({ status: 'NOT_STARTED' }),
          periods: [],
        })
      );
      const softDelId = created.id!;

      // 論理削除（1C時点ではsyncが未対応のため手動でフラグを立てる）
      await global.prisma.wbsTask.update({
        where: { id: softDelId },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // findById（有効のみ）→ null
      expect(await taskRepository.findById(softDelId)).toBeNull();

      // findActiveByWbsId（有効のみ）→ 含まれない
      const active = await taskRepository.findActiveByWbsId(testIds.wbsId);
      expect(active.some((t) => t.id === softDelId)).toBe(false);

      // findIncludingDeletedByWbsId（削除込み）→ 含まれる
      const including = await taskRepository.findIncludingDeletedByWbsId(testIds.wbsId);
      expect(including.some((t) => t.id === softDelId)).toBe(true);

      // クリーンアップ（物理削除）
      await global.prisma.wbsTask.delete({ where: { id: softDelId } });
    });
  });

  describe('applySyncDiff / findSyncStateByWbsId（差分同期）', () => {
    const createdTaskNos = ['SD-0001', 'SD-0002'];

    const mkTask = (taskNo: string, name: string, kosu: number): Task => {
      const t = Task.create({
        taskNo: TaskNo.reconstruct(taskNo),
        wbsId: testIds.wbsId,
        name,
        phaseId: testIds.phaseId,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-01'),
            endDate: new Date('2025-05-31'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      return t;
    };

    afterAll(async () => {
      // 後始末：TaskStatusLog（Restrict）を先に削除してからタスクを物理削除（period/kosuはCascade）
      await global.prisma.taskStatusLog
        .deleteMany({ where: { task: { wbsId: testIds.wbsId, taskNo: { in: createdTaskNos } } } })
        .catch(() => {});
      await global.prisma.wbsTask
        .deleteMany({ where: { wbsId: testIds.wbsId, taskNo: { in: createdTaskNos } } })
        .catch(() => {});
    });

    it('create→update(増殖なし)→soft-delete(紐づけ保持)→revive を通しで検証', async () => {
      const now = new Date();

      // 1) 新規作成
      await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [mkTask('SD-0001', '名前A', 10), mkTask('SD-0002', '名前B', 20)], toUpdate: [], toSoftDeleteIds: [] },
        now,
      );

      let state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
      const s1 = state.find((s) => s.taskNo === 'SD-0001')!;
      const s2 = state.find((s) => s.taskNo === 'SD-0002')!;
      expect(s1).toBeTruthy();
      expect(s2).toBeTruthy();
      expect(s1.isDeleted).toBe(false);
      expect(await global.prisma.taskPeriod.count({ where: { taskId: s1.id } })).toBe(1);

      // 2) update（id保持・period増殖しない）
      const upd = mkTask('SD-0001', '名前A-改', 15);
      upd.id = s1.id;
      await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [], toUpdate: [upd], toSoftDeleteIds: [] },
        now,
      );
      expect(await global.prisma.taskPeriod.count({ where: { taskId: s1.id } })).toBe(1);
      expect(await global.prisma.taskKosu.count({ where: { period: { taskId: s1.id } } })).toBe(1);
      const reloaded = await taskRepository.findById(s1.id);
      expect(reloaded?.name).toBe('名前A-改');

      // s2 に TaskStatusLog を紐付け（soft-delete後も保持されることの確認用）
      await global.prisma.taskStatusLog.create({
        data: { taskId: s2.id, status: 'NOT_STARTED', changedAt: now },
      });

      // 3) soft-delete（s2をExcelから消した想定）
      await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [], toUpdate: [], toSoftDeleteIds: [s2.id] },
        now,
      );
      state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
      expect(state.find((s) => s.taskNo === 'SD-0002')!.isDeleted).toBe(true);
      // 有効取得から除外される
      const active = await taskRepository.findActiveByWbsId(testIds.wbsId);
      expect(active.some((t) => t.taskNo.getValue() === 'SD-0002')).toBe(false);
      // 紐づけ（StatusLog）は物理削除されず保持される
      expect(await global.prisma.taskStatusLog.count({ where: { taskId: s2.id } })).toBe(1);

      // 4) revive（s2のtaskNoが再登場）
      const rev = mkTask('SD-0002', '名前B-復活', 20);
      rev.id = s2.id;
      await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [], toUpdate: [rev], toSoftDeleteIds: [] },
        now,
      );
      state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
      expect(state.find((s) => s.taskNo === 'SD-0002')!.isDeleted).toBe(false);
      const revived = await taskRepository.findById(s2.id);
      expect(revived?.name).toBe('名前B-復活');
    });
  });

  describe('applySyncDiff：スナップショット書き込み（2A）', () => {
    const taskNos = ['SS-0001', 'SS-0002'];
    const syncLogIds: number[] = [];

    const mkTask = (taskNo: string): Task =>
      Task.create({
        taskNo: TaskNo.reconstruct(taskNo),
        wbsId: testIds.wbsId,
        name: `snapshot-${taskNo}`,
        phaseId: testIds.phaseId,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [],
      });

    const snapInput = (
      taskNo: string,
      taskId: number | null,
      isRemoved = false,
    ): TaskProgressSnapshotInput => ({
      taskId,
      taskNo,
      progressRate: 50,
      status: 'IN_PROGRESS',
      plannedManHours: 20,
      baseManHours: 10,
      costPerHour: 5000,
      plannedStart: new Date('2025-05-01'),
      plannedEnd: new Date('2025-05-31'),
      baseStart: new Date('2025-05-01'),
      baseEnd: new Date('2025-05-31'),
      actualStart: null,
      actualEnd: null,
      isRemoved,
    });

    afterAll(async () => {
      await global.prisma.taskProgressSnapshot
        .deleteMany({ where: { taskNo: { in: taskNos } } })
        .catch(() => {});
      if (syncLogIds.length) {
        await global.prisma.syncLog.deleteMany({ where: { id: { in: syncLogIds } } }).catch(() => {});
      }
      await global.prisma.wbsTask
        .deleteMany({ where: { wbsId: testIds.wbsId, taskNo: { in: taskNos } } })
        .catch(() => {});
    });

    it('SyncLog採番＋各タスクのスナップショットが同一syncLogIdで作成される', async () => {
      const now = new Date();
      const { syncLogId } = await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [mkTask('SS-0001'), mkTask('SS-0002')], toUpdate: [], toSoftDeleteIds: [] },
        now,
        {
          syncLogData: {
            projectId: testIds.projectId,
            syncStatus: 'SUCCESS',
            syncedAt: now,
            recordCount: 2,
            addedCount: 2,
            updatedCount: 0,
            deletedCount: 0,
          },
          snapshotInputs: [snapInput('SS-0001', null), snapInput('SS-0002', null)],
          snapshotAt: now,
        },
      );

      expect(syncLogId).not.toBeNull();
      syncLogIds.push(syncLogId!);

      const snaps = await global.prisma.taskProgressSnapshot.findMany({
        where: { syncLogId: syncLogId! },
      });
      expect(snaps).toHaveLength(2);
      expect(snaps.every((s) => !s.isRemoved)).toBe(true);

      // 新規タスクの taskId が create 結果の id に解決されている
      const state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
      const id1 = state.find((s) => s.taskNo === 'SS-0001')!.id;
      expect(snaps.find((s) => s.taskNo === 'SS-0001')!.taskId).toBe(id1);
    });

    it('2回目の同期で別世代が蓄積され、消失タスクは isRemoved=true のtombstone', async () => {
      const state = await taskRepository.findSyncStateByWbsId(testIds.wbsId);
      const t1 = state.find((s) => s.taskNo === 'SS-0001')!;
      const t2 = state.find((s) => s.taskNo === 'SS-0002')!;
      const now = new Date();
      const upd = mkTask('SS-0001');
      upd.id = t1.id;

      const { syncLogId } = await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [], toUpdate: [upd], toSoftDeleteIds: [t2.id] },
        now,
        {
          syncLogData: {
            projectId: testIds.projectId,
            syncStatus: 'SUCCESS',
            syncedAt: now,
            recordCount: 1,
            addedCount: 0,
            updatedCount: 1,
            deletedCount: 1,
          },
          snapshotInputs: [snapInput('SS-0001', t1.id), snapInput('SS-0002', t2.id, true)],
          snapshotAt: now,
        },
      );
      syncLogIds.push(syncLogId!);

      // SS-0001 は2世代分のスナップショット
      const s1snaps = await global.prisma.taskProgressSnapshot.findMany({
        where: { taskNo: 'SS-0001' },
      });
      expect(s1snaps.length).toBeGreaterThanOrEqual(2);

      // 消失タスクは tombstone
      const tomb = await global.prisma.taskProgressSnapshot.findFirst({
        where: { syncLogId: syncLogId!, taskNo: 'SS-0002' },
      });
      expect(tomb?.isRemoved).toBe(true);
    });
  });

  describe('applySyncDiff：差分updateで不在のnullableをクリアする', () => {
    const taskNo = 'NULLCLR-0001';
    const userId = 'nullclr-user-1';
    let assigneeId: number;
    let taskId: number;

    beforeAll(async () => {
      await global.prisma.users.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: 'nullclr@example.com', name: 'NC', displayName: 'NC' },
      });
      const assignee = await global.prisma.wbsAssignee.create({
        data: { wbsId: testIds.wbsId, assigneeId: userId },
      });
      assigneeId = assignee.id;
      const t = await global.prisma.wbsTask.create({
        data: {
          taskNo,
          name: 'クリア前',
          wbsId: testIds.wbsId,
          phaseId: testIds.phaseId,
          assigneeId,
          status: 'IN_PROGRESS',
          progressRate: 90,
        },
      });
      taskId = t.id;
    });

    afterAll(async () => {
      await global.prisma.wbsTask
        .deleteMany({ where: { wbsId: testIds.wbsId, taskNo } })
        .catch(() => {});
      await global.prisma.wbsAssignee.delete({ where: { id: assigneeId } }).catch(() => {});
      await global.prisma.users.delete({ where: { id: userId } }).catch(() => {});
    });

    it('Excelで担当者・進捗が空になった更新は、DBの古い値をクリアする', async () => {
      // 担当者・進捗を持たない更新タスク（Excelで空欄になった想定）
      const upd = Task.create({
        taskNo: TaskNo.reconstruct(taskNo),
        wbsId: testIds.wbsId,
        name: 'クリア後',
        phaseId: testIds.phaseId,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
      });
      upd.id = taskId;

      await taskRepository.applySyncDiff(
        testIds.wbsId,
        { toCreate: [], toUpdate: [upd], toSoftDeleteIds: [] },
        new Date(),
      );

      const row = await global.prisma.wbsTask.findUnique({ where: { id: taskId } });
      expect(row?.assigneeId).toBeNull(); // 担当者がクリアされる
      expect(Number(row?.progressRate)).toBe(0); // 進捗が0にクリアされる
      expect(row?.name).toBe('クリア後');
    });
  });

  describe('エラーケース', () => {
    it('存在しないIDを指定した場合はnullを返すこと', async () => {
      const nonExistingTask = await taskRepository.findById(999999);
      expect(nonExistingTask).toBeNull();
    });

    it('存在しないWBSを指定した場合は空の配列を返すこと', async () => {
      const tasks = await taskRepository.findAll(9999);
      expect(tasks).toEqual([]);
    });
  });
});