// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/applications/task-application-service.test.ts
import { ITaskRepository } from "@/applications/task/itask-repository";
import { TaskApplicationService } from "@/applications/task/task-application-service";
import { Task } from "@/domains/task/task";
import { TaskId } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { Assignee } from "@/domains/task/assignee";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";

// Jestのモック機能を使用してリポジトリをモック化
jest.mock("@/applications/task/itask-repository");
jest.mock("@/domains/task/interfaces/task-factory");

describe('TaskApplicationService', () => {
  let taskRepository: jest.Mocked<ITaskRepository>;
  let taskFactory: jest.Mocked<ITaskFactory>;
  let taskApplicationService: TaskApplicationService;
  const startDate = new Date('2025-05-01');
  const endDate = new Date('2025-05-31');
  const wbsId = 1;

  beforeEach(() => {
    // モックリポジトリとファクトリを作成
    taskRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    taskFactory = {
      createTaskId: jest.fn(),
    };

    taskApplicationService = new TaskApplicationService(taskRepository, taskFactory);
  });

  describe('getTaskById', () => {
    it('存在するIDのタスクを取得できること', async () => {
      // モックの返り値を設定
      const taskId = TaskId.reconstruct('D1-0001');
      const mockTask = Task.create({
        id: taskId,
        wbsId: wbsId,
        name: 'テストタスク',
        phaseId: 1,
        assigneeId: 'user1',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate,
            endDate,
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

      // assigneeとphaseの設定
      const assignee = Assignee.create({
        name: 'ユーザー1',
        displayName: 'テストユーザー1'
      });
      Object.defineProperty(mockTask, 'assignee', { value: assignee });

      const phase = Phase.create({
        name: '設計フェーズ',
        code: new PhaseCode('DESIGN'),
        seq: 1
      });
      Object.defineProperty(mockTask, 'phase', { value: phase });

      taskRepository.findById.mockResolvedValue(mockTask);

      // テスト対象メソッド実行
      const result = await taskApplicationService.getTaskById(wbsId, 'D1-0001');

      // 検証
      expect(taskRepository.findById).toHaveBeenCalledWith(wbsId, 'D1-0001');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('D1-0001');
      expect(result?.name).toBe('テストタスク');
      expect(result?.status).toBe('NOT_STARTED');
      expect(result?.assigneeId).toBe('user1');
      expect(result?.assignee?.displayName).toBe('テストユーザー1');
      expect(result?.phaseId).toBe(1);
      expect(result?.phase?.name).toBe('設計フェーズ');
      expect(result?.yoteiStart).toEqual(startDate);
      expect(result?.yoteiEnd).toEqual(endDate);
      expect(result?.yoteiKosu).toBe(10);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      // モックが null を返すように設定
      taskRepository.findById.mockResolvedValue(null);

      const result = await taskApplicationService.getTaskById(wbsId, 'not-exist');

      expect(taskRepository.findById).toHaveBeenCalledWith(wbsId, 'not-exist');
      expect(result).toBeNull();
    });
  });

  describe('getTaskAll', () => {
    it('すべてのタスクを取得できること', async () => {
      // モックの返り値を設定
      const task1 = Task.create({
        id: TaskId.reconstruct('D1-0001'),
        wbsId: wbsId,
        name: 'タスク1',
        phaseId: 1,
        assigneeId: 'user1',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate,
            endDate,
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({
              kosu: 10,
              type: new ManHourType({ type: 'NORMAL' })
            })]
          })
        ]
      });

      const task2 = Task.create({
        id: TaskId.reconstruct('D1-0002'),
        wbsId: wbsId,
        name: 'タスク2',
        phaseId: 2,
        assigneeId: 'user2',
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.create({
            startDate: new Date('2025-06-01'),
            endDate: new Date('2025-06-30'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({
              kosu: 20,
              type: new ManHourType({ type: 'NORMAL' })
            })]
          })
        ]
      });

      taskRepository.findAll.mockResolvedValue([task1, task2]);

      // テスト対象メソッド実行
      const results = await taskApplicationService.getTaskAll(wbsId);

      // 検証
      expect(taskRepository.findAll).toHaveBeenCalledWith(wbsId);
      expect(results).not.toBeNull();
      expect(results?.length).toBe(2);
      expect(results?.[0].id).toBe('D1-0001');
      expect(results?.[1].id).toBe('D1-0002');
      expect(results?.[0].status).toBe('NOT_STARTED');
      expect(results?.[1].status).toBe('IN_PROGRESS');
    });

    it('タスクが存在しない場合は空の配列を返すこと', async () => {
      taskRepository.findAll.mockResolvedValue([]);

      const results = await taskApplicationService.getTaskAll(wbsId);

      expect(taskRepository.findAll).toHaveBeenCalledWith(wbsId);
      expect(results).toEqual([]);
    });
  });

  describe('createTask', () => {
    it('タスクを新規作成できること', async () => {
      // createTaskIdのモック
      const mockTaskId = TaskId.reconstruct('D1-0001');
      taskFactory.createTaskId.mockResolvedValue(mockTaskId);

      // createのモック
      taskRepository.create.mockImplementation((task) => {
        // IDが設定された新しいタスクを返す
        return Promise.resolve(task);
      });

      const yoteiStartDate = new Date('2025-05-01');
      const yoteiEndDate = new Date('2025-05-31');

      // テスト対象メソッド実行
      const result = await taskApplicationService.createTask({
        id: 'D1-0001',
        name: '新規タスク',
        wbsId: wbsId,
        phaseId: 1,
        yoteiStartDate,
        yoteiEndDate,
        yoteiKosu: 10,
        assigneeId: 'user1',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
      });

      // 検証
      expect(taskFactory.createTaskId).toHaveBeenCalledWith(wbsId, 1);
      expect(taskRepository.create).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // createに渡されたタスクオブジェクトを検証
      const createdTask = taskRepository.create.mock.calls[0][0];
      expect(createdTask.name).toBe('新規タスク');
      expect(createdTask.wbsId).toBe(wbsId);
      expect(createdTask.phaseId).toBe(1);
      expect(createdTask.assigneeId).toBe('user1');
      expect(createdTask.periods?.length).toBe(1);
      expect(createdTask.periods?.[0].type.type).toBe('YOTEI');
      expect(createdTask.periods?.[0].startDate).toEqual(yoteiStartDate);
      expect(createdTask.periods?.[0].endDate).toEqual(yoteiEndDate);
      expect(createdTask.periods?.[0].manHours[0].kosu).toBe(10);
    });
  });

  describe('updateTask', () => {
    it('タスク情報を更新できること', async () => {
      // 既存のタスクをモック
      const taskId = TaskId.reconstruct('D1-0001');
      const existingTask = Task.create({
        id: taskId,
        wbsId: wbsId,
        name: '更新前タスク',
        phaseId: 1,
        assigneeId: 'user1',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate,
            endDate,
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

      taskRepository.findById.mockResolvedValue(existingTask);

      // updateのモック
      taskRepository.update.mockImplementation((wbsId, id, task) => {
        return Promise.resolve(task);
      });

      const newStartDate = new Date('2025-06-01');
      const newEndDate = new Date('2025-06-30');

      // テスト対象メソッド実行
      const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        id: 'D1-0001',
        updateTask: {
          id: 'D1-0001',
          name: '更新後タスク',
          phaseId: 2,
          assigneeId: 'user2',
          status: 'IN_PROGRESS',
          yoteiStart: newStartDate,
          yoteiEnd: newEndDate,
          yoteiKosu: 20
        }
      });

      // 検証
      expect(taskRepository.findById).toHaveBeenCalledWith(wbsId, 'D1-0001');
      expect(taskRepository.update).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // updateに渡されたTaskオブジェクトを検証
      const updatedTask = taskRepository.update.mock.calls[0][2];
      expect(updatedTask.name).toBe('更新後タスク');
      expect(updatedTask.phaseId).toBe(2);
      expect(updatedTask.assigneeId).toBe('user2');
      expect(updatedTask.status.getStatus()).toBe('IN_PROGRESS');
      expect(updatedTask.getYoteiStart()).toEqual(newStartDate);
      expect(updatedTask.getYoteiEnd()).toEqual(newEndDate);
      expect(updatedTask.getYoteiKosus()).toBe(20);
    });

    it('更新対象のタスクが存在しない場合はエラーを返すこと', async () => {
      // 対象のタスクが存在しないようにモック
      taskRepository.findById.mockResolvedValue(null);

      const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        id: 'not-exist',
        updateTask: {
          name: '存在しないタスク',
          status: 'NOT_STARTED'
        }
      });

      expect(taskRepository.findById).toHaveBeenCalledWith(wbsId, 'not-exist');
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('タスクが見つかりません');
    });
  });
});