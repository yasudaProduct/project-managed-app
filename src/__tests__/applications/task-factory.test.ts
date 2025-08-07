// filepath: /Users/yuta/Develop/project-managed-app/src/__tests__/applications/task-factory.test.ts
import { ITaskRepository } from "@/applications/task/itask-repository";
import { TaskFactory } from "@/applications/task/task-factory";
import { IPhaseRepository } from "@/applications/task/iphase-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";

// モックの設定
jest.mock("@/applications/task/itask-repository");
jest.mock("@/applications/task/iphase-repository");

describe('TaskFactory', () => {
  let taskRepository: jest.Mocked<ITaskRepository>;
  let phaseRepository: jest.Mocked<IPhaseRepository>;
  let taskFactory: TaskFactory;
  const wbsId = 1;

  beforeEach(() => {
    // モックリポジトリの作成
    taskRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByAssigneeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    phaseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByWbsId: jest.fn(),
      findAllTemplates: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
    };

    taskFactory = new TaskFactory(taskRepository, phaseRepository);
  });

  describe('createTaskId', () => {
    it('正しいフォーマットのTaskIdを生成できること', async () => {
      // フェーズのモック
      const mockPhase = Phase.create({
        name: '設計フェーズ',
        code: new PhaseCode('D1'),
        seq: 1
      });

      phaseRepository.findById.mockResolvedValue(mockPhase);

      // タスクが存在しない場合（初めてのタスク）
      taskRepository.findAll.mockResolvedValue([]);

      // テスト対象メソッド実行
      const taskId = await taskFactory.createTaskId(wbsId, 1);

      // 検証
      expect(phaseRepository.findById).toHaveBeenCalledWith(1);
      expect(taskRepository.findAll).toHaveBeenCalledWith(wbsId);
      expect(taskId.getValue()).toBe('D1-0001');
    });

    it('既存のタスクがある場合、連番で次の番号を生成すること', async () => {
      // フェーズのモック
      const mockPhase = Phase.create({
        name: '設計',
        code: new PhaseCode('D1'),
        seq: 1
      });

      phaseRepository.findById.mockResolvedValue(mockPhase);

      // 既存のタスクをモック（D10-0001, D10-0002が存在する）
      const task1 = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId: wbsId,
        phaseId: 1,
        name: 'タスク1',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
      });

      const task2 = Task.create({
        taskNo: TaskNo.reconstruct('D1-0002'),
        wbsId: wbsId,
        phaseId: 1,
        name: 'タスク2',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
      });

      taskRepository.findAll.mockResolvedValue([task1, task2]);

      // テスト対象メソッド実行
      const taskId = await taskFactory.createTaskId(wbsId, 1);

      // 検証 - D10-0003が生成されるべき
      expect(taskId.getValue()).toBe('D1-0003');
    });

    it('異なるフェーズコードのタスクがある場合、新しいフェーズでは1から始まること', async () => {
      // 開発フェーズのモック
      const mockPhase = Phase.create({
        name: '開発フェーズ',
        code: new PhaseCode('E1'),
        seq: 2
      });

      phaseRepository.findById.mockResolvedValue(mockPhase);

      // 既存のタスクは設計フェーズのみ
      const task1 = Task.create({
        taskNo: TaskNo.reconstruct('D10-0001'),
        wbsId: wbsId,
        name: '設計タスク1',
        status: new TaskStatus({ status: 'COMPLETED' }),
      });

      const task2 = Task.create({
        taskNo: TaskNo.reconstruct('D10-0002'),
        wbsId: wbsId,
        name: '設計タスク2',
        status: new TaskStatus({ status: 'COMPLETED' }),
      });

      taskRepository.findAll.mockResolvedValue([task1, task2]);

      // テスト対象メソッド実行（開発フェーズのタスクID生成）
      const taskId = await taskFactory.createTaskId(wbsId, 2);

      // 検証 - DEV-1が生成されるべき
      expect(taskId.getValue()).toBe('E1-0001');
    });

    it('指定されたフェーズが存在しない場合はエラーを投げること', async () => {
      // フェーズが存在しないケース
      phaseRepository.findById.mockResolvedValue(null);

      // テスト対象メソッド実行 - エラーが発生することを検証
      await expect(taskFactory.createTaskId(wbsId, 999)).rejects.toThrow('Phase not found');

      expect(phaseRepository.findById).toHaveBeenCalledWith(999);
    });

    it('同一フェーズで番号が飛んでいる場合でも、最大値の次の番号を返すこと', async () => {
      // フェーズのモック
      const mockPhase = Phase.create({
        name: '設計フェーズ',
        code: new PhaseCode('D1'),
        seq: 1
      });

      phaseRepository.findById.mockResolvedValue(mockPhase);

      // タスクDESIGN-1とDESIGN-3が存在する（DESIGN-2は欠番）
      const task1 = Task.create({
        taskNo: TaskNo.reconstruct('D1-0001'),
        wbsId: wbsId,
        phaseId: 1,
        name: 'タスク1',
        status: new TaskStatus({ status: 'COMPLETED' }),
      });

      const task3 = Task.create({
        taskNo: TaskNo.reconstruct('D1-0003'),
        wbsId: wbsId,
        phaseId: 1,
        name: 'タスク3',
        status: new TaskStatus({ status: 'NOT_STARTED' }),
      });

      taskRepository.findAll.mockResolvedValue([task1, task3]);

      // テスト対象メソッド実行
      const taskId = await taskFactory.createTaskId(wbsId, 1);

      // 検証 - 最大値の3の次の4が生成されるべき
      expect(taskId.getValue()).toBe('D1-0004');
    });
  });
});