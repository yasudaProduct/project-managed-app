// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/applications/task-application-service.test.ts
import { ITaskRepository, ManualSnapshotContext } from "@/applications/task/itask-repository";
import { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { TaskApplicationService } from "@/applications/task/task-application-service";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/task-status";
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
  let wbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
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
      findLatestSnapshotActuals: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ITaskRepository>;

    taskFactory = {
      createTaskId: jest.fn(),
    };

    wbsAssigneeRepository = {
      findByWbsId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IWbsAssigneeRepository>;

    taskApplicationService = new TaskApplicationService(taskRepository, taskFactory, wbsAssigneeRepository);
  });

  describe('getTaskById', () => {
    it('存在するIDのタスクを取得できること', async () => {
      // モックの返り値を設定
      const taskId = TaskNo.reconstruct('D1-0001');
      const mockTask = Task.create({
        taskNo: taskId,
        wbsId: wbsId,
        name: 'テストタスク',
        phaseId: 1,
        assigneeId: 1,
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
      Object.defineProperty(mockTask, 'id', { value: 1 });

      const phase = Phase.create({
        name: '設計フェーズ',
        code: new PhaseCode('DESIGN'),
        seq: 1
      });
      Object.defineProperty(mockTask, 'phase', { value: phase });

      taskRepository.findById.mockResolvedValue(mockTask);

      // テスト対象メソッド実行
      const result = await taskApplicationService.getTaskById(mockTask.id!);

      // 検証
      expect(taskRepository.findById).toHaveBeenCalledWith(mockTask.id!);
      expect(result).not.toBeNull();
      expect(result?.taskNo).toBe('D1-0001');
      expect(result?.name).toBe('テストタスク');
      expect(result?.status).toBe('NOT_STARTED');
      expect(result?.assigneeId).toBe(1);
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

      const result = await taskApplicationService.getTaskById(1);

      expect(taskRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('getTaskAll', () => {
    it('すべてのタスクを取得できること', async () => {
      // モックの返り値を設定
      const task1 = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId: wbsId,
        name: 'タスク1',
        phaseId: 1,
        assigneeId: 1,
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
        taskNo: TaskNo.reconstruct('D1-0002'),
        wbsId: wbsId,
        name: 'タスク2',
        phaseId: 2,
        assigneeId: 2,
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
      expect(results?.[0].taskNo).toBe('D1-0001');
      expect(results?.[1].taskNo).toBe('D1-0002');
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
      const mockTaskId = TaskNo.reconstruct('D1-0001');
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
        name: '新規タスク',
        wbsId: wbsId,
        phaseId: 1,
        yoteiStartDate,
        yoteiEndDate,
        yoteiKosu: 10,
        assigneeId: 1,
        status: 'NOT_STARTED',
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
      expect(createdTask.assigneeId).toBe(1);
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
      const taskId = TaskNo.reconstruct('D1-0001');
      const existingTask = Task.create({
        taskNo: taskId,
        wbsId: wbsId,
        name: '更新前タスク',
        phaseId: 1,
        assigneeId: 1,
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
      Object.defineProperty(existingTask, 'id', { value: 1 });
      taskRepository.findById.mockResolvedValue(existingTask);

      // updateのモック
      taskRepository.update.mockImplementation((wbsId, task) => {
        return Promise.resolve(task);
      });

      const newStartDate = new Date('2025-06-01');
      const newEndDate = new Date('2025-06-30');

      // テスト対象メソッド実行
      const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        updateTask: {
          id: 1,
          taskNo: 'D1-0001',
          name: '更新後タスク',
          phaseId: 2,
          assigneeId: 2,
          status: 'IN_PROGRESS',
          yoteiStart: newStartDate,
          yoteiEnd: newEndDate,
          yoteiKosu: 20
        }
      });

      // 検証
      expect(taskRepository.findById).toHaveBeenCalledWith(1);
      expect(taskRepository.update).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // updateに渡されたTaskオブジェクトを検証
      const updatedTask = taskRepository.update.mock.calls[0][1];
      expect(updatedTask.name).toBe('更新後タスク');
      expect(updatedTask.phaseId).toBe(2);
      expect(updatedTask.assigneeId).toBe(2);
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
        updateTask: {
          id: 1,
          taskNo: 'not-exist',
          name: '存在しないタスク',
          status: 'NOT_STARTED'
        }
      });

      expect(taskRepository.findById).toHaveBeenCalledWith(1);
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('タスクが見つかりません');
    });

    it('progressRate を指定するとタスクの進捗率が更新されること', async () => {
      const existingTask = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId,
        name: 'タスク',
        phaseId: 1,
        assigneeId: 1,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
        progressRate: 10,
      });
      Object.defineProperty(existingTask, 'id', { value: 1 });
      taskRepository.findById.mockResolvedValue(existingTask);
      taskRepository.update.mockImplementation((_, task) => Promise.resolve(task));

      const result = await taskApplicationService.updateTask({
        wbsId,
        updateTask: {
          id: 1,
          name: 'タスク',
          status: 'IN_PROGRESS',
          assigneeId: 1,
          phaseId: 1,
          progressRate: 60,
        },
      });

      expect(result.success).toBe(true);
      const updatedTask = taskRepository.update.mock.calls[0][1];
      expect(updatedTask.progressRate).toBe(60);
    });

    it('progressRate 未指定なら既存の進捗率を維持すること', async () => {
      const existingTask = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId,
        name: 'タスク',
        phaseId: 1,
        assigneeId: 1,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
        progressRate: 45,
      });
      Object.defineProperty(existingTask, 'id', { value: 1 });
      taskRepository.findById.mockResolvedValue(existingTask);
      taskRepository.update.mockImplementation((_, task) => Promise.resolve(task));

      await taskApplicationService.updateTask({
        wbsId,
        updateTask: {
          id: 1,
          name: 'タスク',
          status: 'IN_PROGRESS',
          assigneeId: 1,
          phaseId: 1,
        },
      });

      const updatedTask = taskRepository.update.mock.calls[0][1];
      expect(updatedTask.progressRate).toBe(45);
    });

    it('更新時に進捗スナップショット（手動記録）が同時に渡されること', async () => {
      const existingTask = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId,
        name: 'タスク',
        phaseId: 1,
        assigneeId: 7,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.create({
            startDate,
            endDate,
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 20, type: new ManHourType({ type: 'NORMAL' }) }),
            ],
          }),
        ],
        progressRate: 10,
      });
      Object.defineProperty(existingTask, 'id', { value: 1 });
      taskRepository.findById.mockResolvedValue(existingTask);
      taskRepository.update.mockImplementation((_, task) => Promise.resolve(task));
      (wbsAssigneeRepository.findByWbsId as jest.Mock).mockResolvedValue([
        { id: 7, userName: '田中', getCostPerHour: () => 4000 },
      ]);
      (taskRepository.findLatestSnapshotActuals as jest.Mock).mockResolvedValue({
        actualStart: new Date('2025-05-02'),
        actualEnd: null,
      });

      await taskApplicationService.updateTask({
        wbsId,
        updateTask: {
          id: 1,
          name: 'タスク',
          status: 'IN_PROGRESS',
          assigneeId: 7,
          phaseId: 1,
          progressRate: 60,
        },
      });

      const snapshot = taskRepository.update.mock.calls[0][2] as ManualSnapshotContext;
      expect(snapshot).toBeDefined();
      expect(snapshot.wbsId).toBe(wbsId);
      expect(snapshot.snapshotAt).toBeInstanceOf(Date);
      expect(snapshot.input).toEqual(
        expect.objectContaining({
          taskId: 1,
          taskNo: 'D1-0001',
          progressRate: 60,
          status: 'IN_PROGRESS',
          plannedManHours: 20,
          costPerHour: 4000, // 担当者単価を引き当て
          actualStart: new Date('2025-05-02'), // 直近スナップショットから実績日を引き継ぐ
          actualEnd: null,
          isRemoved: false,
        }),
      );
    });
  });

  describe('deleteTask', () => {
    it('削除時に tombstone スナップショットが渡されること', async () => {
      const existingTask = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId,
        name: '削除対象',
        phaseId: 1,
        assigneeId: 1,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [],
      });
      Object.defineProperty(existingTask, 'id', { value: 9 });
      taskRepository.findById.mockResolvedValue(existingTask);
      taskRepository.delete.mockResolvedValue(undefined);

      const result = await taskApplicationService.deleteTask(9);

      expect(result.success).toBe(true);
      const [deletedId, tombstone] = taskRepository.delete.mock.calls[0] as [number, ManualSnapshotContext];
      expect(deletedId).toBe(9);
      expect(tombstone.wbsId).toBe(wbsId);
      expect(tombstone.input).toEqual(
        expect.objectContaining({
          taskId: 9,
          taskNo: 'D1-0001',
          isRemoved: true,
        }),
      );
    });

    it('削除対象が存在しない場合はエラーを返し delete を呼ばないこと', async () => {
      taskRepository.findById.mockResolvedValue(null);

      const result = await taskApplicationService.deleteTask(999);

      expect(result.success).toBe(false);
      expect(taskRepository.delete).not.toHaveBeenCalled();
    });
  });
});