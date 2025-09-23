// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/infrastructures/task-repository.test.ts
import { TaskRepository } from "@/infrastructures/task-repository";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import prisma from "@/lib/prisma/prisma";

// Prismaクライアントのモック化
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    wbsTask: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskPeriod: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
    taskKosu: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
    workRecord: {
      findMany: jest.fn(),
    },
  },
}));

describe('TaskRepository', () => {
  let taskRepository: TaskRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const wbsId = 1;
  const taskId = 1;
  const taskNo = 'D1-0001';
  const startDate = new Date('2025-05-01');
  const endDate = new Date('2025-05-31');

  // コンソール出力の抑制（テスト中のログを非表示にする）
  const originalConsoleLog = console.log;
  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    taskRepository = new TaskRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('存在するIDのタスクを取得できること', async () => {
      // モックの設定
      const mockTaskData = {
        id: taskId,
        taskNo: taskNo,
        wbsId: wbsId,
        name: 'テストタスク',
        status: 'NOT_STARTED' as const,
        assigneeId: 1,
        phaseId: 1,
        assignee: {
          assignee: {
            id: 1,
            name: 'ユーザー1',
            displayName: 'テストユーザー1'
          }
        },
        phase: {
          id: 1,
          wbsId: 1,
          name: '設計フェーズ',
          code: 'D1',
          seq: 1
        },
        periods: [
          {
            id: 1,
            taskId: taskNo,
            startDate,
            endDate,
            type: 'YOTEI' as const,
            kosus: [
              {
                id: 1,
                periodId: 1,
                wbsId: wbsId,
                kosu: 10,
                type: 'NORMAL' as const
              }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prismaMock.wbsTask.findUnique as jest.Mock).mockResolvedValue(mockTaskData);

      // メソッド実行
      const task = await taskRepository.findById(taskId);

      // 検証
      expect(prismaMock.wbsTask.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        include: {
          assignee: {
            include: {
              assignee: true,
            },
          },
          phase: true,
          periods: {
            include: {
              kosus: true,
            },
          },
        }
      });
      expect(task).not.toBeNull();
      expect(task?.taskNo?.getValue()).toBe(taskNo);
      expect(task?.name).toBe('テストタスク');
      expect(task?.status.getStatus()).toBe('NOT_STARTED');
      expect(task?.assigneeId).toBe(1);
      expect(task?.assignee?.displayName).toBe('テストユーザー1');
      expect(task?.phaseId).toBe(1);
      expect(task?.phase?.name).toBe('設計フェーズ');
      expect(task?.periods?.length).toBe(1);
      expect(task?.periods?.[0].type.type).toBe('YOTEI');
      expect(task?.periods?.[0].startDate).toEqual(startDate);
      expect(task?.periods?.[0].endDate).toEqual(endDate);
      expect(task?.periods?.[0].manHours[0].kosu).toBe(10);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.wbsTask.findUnique as jest.Mock).mockResolvedValue(null);

      const task = await taskRepository.findById(taskId);

      expect(prismaMock.wbsTask.findUnique).toHaveBeenCalledWith({
        where: { id: wbsId },
        include: expect.anything()
      });
      expect(task).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべてのタスクを取得できること', async () => {
      // タスクデータのモック
      const mockTasksData = [
        {
          id: 1,
          taskNo: 'D1-0001',
          wbsId: wbsId,
          name: 'タスク1',
          status: 'NOT_STARTED' as const,
          assigneeId: 1,
          phaseId: 1,
          assignee: {
            assignee: {
              id: 1,
              name: 'ユーザー1',
              displayName: 'テストユーザー1'
            }
          },
          phase: {
            id: 1,
            wbsId: 1,
            name: '設計フェーズ',
            code: 'D1',
            seq: 1
          },
          periods: [
            {
              id: 1,
              taskId: 1,
              startDate,
              endDate,
              type: 'YOTEI' as const,
              kosus: [
                {
                  id: 1,
                  periodId: 1,
                  wbsId: wbsId,
                  kosu: 10,
                  type: 'NORMAL' as const
                }
              ]
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          taskNo: 'D2-0001',
          wbsId: wbsId,
          name: 'タスク2',
          status: 'IN_PROGRESS' as const,
          assigneeId: 2,
          phaseId: 2,
          assignee: {
            assignee: {
              id: 2,
              name: 'ユーザー2',
              displayName: 'テストユーザー2'
            }
          },
          phase: {
            id: 2,
            wbsId: 1,
            name: '開発フェーズ',
            code: 'D2',
            seq: 2
          },
          periods: [
            {
              id: 2,
              taskId: 2,
              startDate: new Date('2025-06-01'),
              endDate: new Date('2025-06-30'),
              type: 'YOTEI' as const,
              kosus: [
                {
                  id: 2,
                  periodId: 2,
                  wbsId: wbsId,
                  kosu: 20,
                  type: 'NORMAL' as const
                }
              ]
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockWorkRecordsData = [
        {
          id: 1,
          taskId: 1,
          date: new Date('2025-05-10'),
          hours_worked: 5
        },
        {
          id: 2,
          taskId: 2,
          date: new Date('2025-06-15'),
          hours_worked: 8
        }
      ];

      (prismaMock.wbsTask.findMany as jest.Mock).mockResolvedValue(mockTasksData);
      (prismaMock.workRecord.findMany as jest.Mock).mockResolvedValue(mockWorkRecordsData);

      // メソッド実行
      const tasks = await taskRepository.findAll(wbsId);

      // 検証
      expect(prismaMock.wbsTask.findMany).toHaveBeenCalledWith({
        where: { wbsId },
        include: expect.anything()
      });
      expect(prismaMock.workRecord.findMany).toHaveBeenCalledWith({
        where: {
          taskId: {
            in: [1, 2]
          }
        }
      });
      expect(tasks.length).toBe(2);
      expect(tasks[0].taskNo?.getValue()).toBe('D1-0001');
      expect(tasks[1].taskNo?.getValue()).toBe('D2-0001');
      expect(tasks[0].status.getStatus()).toBe('NOT_STARTED');
      expect(tasks[1].status.getStatus()).toBe('IN_PROGRESS');
      expect(tasks[0].workRecords?.length).toBe(1);
      expect(tasks[1].workRecords?.length).toBe(1);
      expect(tasks[0].workRecords?.[0].manHours).toBe(5);
      expect(tasks[1].workRecords?.[0].manHours).toBe(8);
    });

    it('タスクが存在しない場合は空の配列を返すこと', async () => {
      (prismaMock.wbsTask.findMany as jest.Mock).mockResolvedValue([]);
      (prismaMock.workRecord.findMany as jest.Mock).mockResolvedValue([]);

      const tasks = await taskRepository.findAll(wbsId);

      expect(tasks).toEqual([]);
    });
  });

  describe('create', () => {
    it('タスクを新規作成できること', async () => {
      // 作成するタスクを準備
      const taskNo = TaskNo.reconstruct('D1-0001');
      const newTask = Task.create({
        taskNo: taskNo,
        wbsId: wbsId,
        name: '新規タスク',
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

      // createのモック
      const mockCreatedTask = {
        id: 1,
        taskNo: taskNo.getValue(),
        wbsId: wbsId,
        name: '新規タスク',
        phaseId: 1,
        assigneeId: 1,
        status: 'NOT_STARTED' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCreatedPeriod = {
        id: 1,
        taskId: 1,
        startDate,
        endDate,
        type: 'YOTEI' as const
      };

      const mockCreatedKosu = {
        id: 1,
        periodId: 1,
        wbsId: wbsId,
        kosu: 10,
        type: 'NORMAL' as const
      };

      (prismaMock.wbsTask.create as jest.Mock).mockResolvedValue(mockCreatedTask);
      (prismaMock.taskPeriod.create as jest.Mock).mockResolvedValue(mockCreatedPeriod);
      (prismaMock.taskKosu.create as jest.Mock).mockResolvedValue(mockCreatedKosu);

      // メソッド実行
      const createdTask = await taskRepository.create(newTask);

      // 検証
      expect(prismaMock.wbsTask.create).toHaveBeenCalledWith({
        data: {
          taskNo: 'D1-0001',
          name: '新規タスク',
          wbsId: wbsId,
          phaseId: 1,
          assigneeId: 1,
          status: 'NOT_STARTED',
        }
      });
      expect(prismaMock.taskPeriod.create).toHaveBeenCalledWith({
        data: {
          taskId: 1,
          startDate,
          endDate,
          type: 'YOTEI',
        }
      });
      expect(prismaMock.taskKosu.create).toHaveBeenCalledWith({
        data: {
          periodId: 1,
          kosu: 10,
          type: 'NORMAL',
          wbsId: wbsId,
        }
      });
      expect(createdTask.taskNo?.getValue()).toBe('D1-0001');
      expect(createdTask.name).toBe('新規タスク');
      expect(createdTask.status.getStatus()).toBe('NOT_STARTED');
    });
  });

  describe('update', () => {
    it('タスク情報を更新できること', async () => {
      // 更新するタスクを準備
      const taskNo = TaskNo.reconstruct('D1-0001');
      const task = Task.create({
        taskNo: taskNo,
        wbsId: wbsId,
        name: '更新後タスク',
        phaseId: 2,
        assigneeId: 2,
        status: new TaskStatus({ status: 'IN_PROGRESS' }),
        periods: [
          Period.createFromDb({
            id: 1,
            startDate: new Date('2025-06-01'),
            endDate: new Date('2025-06-30'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.createFromDb({
                id: 1,
                kosu: 20,
                type: new ManHourType({ type: 'NORMAL' })
              })
            ]
          })
        ]
      });
      Object.defineProperty(task, 'id', { value: 1 });

      // updateのモック
      const mockUpdatedTask = {
        id: 1,
        taskNo: 'D1-0001',
        wbsId: wbsId,
        name: '更新後タスク',
        phaseId: 2,
        assigneeId: 2,
        status: 'IN_PROGRESS' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpsertedPeriod = {
        id: 1,
        taskId: 1,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30'),
        type: 'YOTEI' as const
      };

      const mockUpsertedKosu = {
        id: 1,
        periodId: 1,
        wbsId: wbsId,
        kosu: 20,
        type: 'NORMAL' as const
      };

      (prismaMock.wbsTask.update as jest.Mock).mockResolvedValue(mockUpdatedTask);
      (prismaMock.taskPeriod.upsert as jest.Mock).mockResolvedValue(mockUpsertedPeriod);
      (prismaMock.taskKosu.upsert as jest.Mock).mockResolvedValue(mockUpsertedKosu);

      // メソッド実行
      const updatedTask = await taskRepository.update(wbsId, task);

      // 検証
      expect(prismaMock.wbsTask.update).toHaveBeenCalledWith({
        where: { id: 1, wbsId },
        data: {
          name: '更新後タスク',
          phaseId: 2,
          assigneeId: 2,
          status: 'IN_PROGRESS',
        }
      });
      expect(prismaMock.taskPeriod.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-30'),
        },
        create: {
          taskId: 1,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-30'),
          type: 'YOTEI',
        }
      });
      expect(prismaMock.taskKosu.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { kosu: 20 },
        create: {
          periodId: 1,
          wbsId: wbsId,
          kosu: 20,
          type: 'NORMAL',
        }
      });
      expect(updatedTask.taskNo?.getValue()).toBe('D1-0001');
      expect(updatedTask.name).toBe('更新後タスク');
      expect(updatedTask.status.getStatus()).toBe('IN_PROGRESS');
    });
  });

  describe('delete', () => {
    it('タスクを削除できること', async () => {
      (prismaMock.wbsTask.delete as jest.Mock).mockResolvedValue({});

      await taskRepository.delete(1);

      expect(prismaMock.wbsTask.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });
  });
});