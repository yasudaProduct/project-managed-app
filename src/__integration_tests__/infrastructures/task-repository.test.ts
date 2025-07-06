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

describe('TaskRepository Integration Tests', () => {
  let taskRepository: TaskRepository;
  let testTaskId: string;

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
      testTaskId = taskId.getValue();
      testIds.taskId = testTaskId;

      const task = Task.create({
        id: taskId,
        wbsId: testIds.wbsId,
        name: '結合テスト用タスク',
        phaseId: testIds.phaseId,
        assigneeId: 'user1',
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

      // 作成されたタスクを検証
      expect(createdTask).toBeTruthy();
      expect(createdTask.taskNo?.getValue()).toBe(testTaskId);
      expect(createdTask.name).toBe('結合テスト用タスク');
      expect(createdTask.wbsId).toBe(testIds.wbsId);
      expect(createdTask.phaseId).toBe(testIds.phaseId);
      expect(createdTask.status.getStatus()).toBe('NOT_STARTED');
    });

    it('IDによるタスクの取得', async () => {
      // 先ほど作成したタスクをIDで取得
      const task = await taskRepository.findById(testIds.wbsId, testTaskId);

      // 取得したタスクを検証
      expect(task).not.toBeNull();
      expect(task?.taskNo?.getValue()).toBe(testTaskId);
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
        id: additionalTaskId,
        wbsId: testIds.wbsId,
        name: '追加タスク',
        phaseId: testIds.phaseId,
        assigneeId: 'user2',
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
      const originalTask = tasks.find(t => t.taskNo?.getValue() === testTaskId);
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
      const taskToUpdate = await taskRepository.findById(testIds.wbsId, testTaskId);
      expect(taskToUpdate).not.toBeNull();

      if (taskToUpdate) {
        // タスク情報を更新
        taskToUpdate.name = '更新されたタスク名';
        taskToUpdate.status = new TaskStatus({ status: 'IN_PROGRESS' });
        taskToUpdate.assigneeId = 'user3';

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
        const updatedTask = await taskRepository.update(testIds.wbsId, testTaskId, taskToUpdate);

        // 更新されたタスクを検証
        expect(updatedTask).toBeTruthy();
        expect(updatedTask.name).toBe('更新されたタスク名');
        expect(updatedTask.status.getStatus()).toBe('IN_PROGRESS');
        expect(updatedTask.assigneeId).toBe('user3');

        // DBが本当に更新されたことを確認
        const refetchedTask = await taskRepository.findById(testIds.wbsId, testTaskId);
        expect(refetchedTask?.name).toBe('更新されたタスク名');
        expect(refetchedTask?.status.getStatus()).toBe('IN_PROGRESS');
      }
    });

    it('タスクの削除', async () => {
      // タスクを削除
      await taskRepository.delete(testTaskId);

      // 削除されたことを確認
      const deletedTask = await taskRepository.findById(testIds.wbsId, testTaskId);
      expect(deletedTask).toBeNull();

      // クリーンアップ処理でエラーが発生しないようにIDをリセット
      testIds.taskId = '';
    });
  });

  describe('エラーケース', () => {
    it('存在しないIDを指定した場合はnullを返すこと', async () => {
      const nonExistingTask = await taskRepository.findById(testIds.wbsId, 'non-existing-id');
      expect(nonExistingTask).toBeNull();
    });

    it('存在しないWBSを指定した場合は空の配列を返すこと', async () => {
      const tasks = await taskRepository.findAll(9999);
      expect(tasks).toEqual([]);
    });
  });
});