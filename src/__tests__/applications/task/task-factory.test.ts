import { TaskFactory } from "@/applications/task/task-factory";
import { ITaskRepository } from "@/applications/task/itask-repository";
import { IPhaseRepository } from "@/applications/task/iphase-repository";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { Task } from "@/domains/task/task";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import { TaskStatus } from "@/domains/task/value-object/project-status";

// モッククラス
class MockTaskRepository implements ITaskRepository {
  private tasks: Task[] = [];

  setTasks(tasks: Task[]) {
    this.tasks = tasks;
  }

  async findAll(wbsId: number): Promise<Task[]> {
    return this.tasks.filter(task => task.wbsId === wbsId);
  }

  async findById(id: number): Promise<Task | null> {
    return this.tasks.find(task => task.id === id) || null;
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    return this.tasks.filter(task => task.assigneeId === assigneeId);
  }

  async create(task: Task): Promise<Task> {
    this.tasks.push(task);
    return task;
  }

  async update(wbsId: number, task: Task): Promise<Task> {
    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      this.tasks[index] = task;
    }
    return task;
  }

  async delete(id: number): Promise<void> {
    this.tasks = this.tasks.filter(task => task.id !== id);
  }
}

class MockPhaseRepository implements IPhaseRepository {
  private phases: Phase[] = [];

  setPhases(phases: Phase[]) {
    this.phases = phases;
  }

  async findById(id: number): Promise<Phase | null> {
    return this.phases.find(phase => phase.id === id) || null;
  }

  async findAll(): Promise<Phase[]> {
    return this.phases;
  }

  async findByWbsId(wbsId: number): Promise<Phase[]> {
    return this.phases;
  }
}

describe("TaskFactory", () => {
  let taskFactory: TaskFactory;
  let mockTaskRepository: MockTaskRepository;
  let mockPhaseRepository: MockPhaseRepository;

  beforeEach(() => {
    mockTaskRepository = new MockTaskRepository();
    mockPhaseRepository = new MockPhaseRepository();
    taskFactory = new TaskFactory(mockTaskRepository, mockPhaseRepository);
  });

  describe("createTaskId", () => {
    const wbsId = 1;
    const phaseId = 100;
    const phaseCode = "D1";

    beforeEach(() => {
      // テスト用のフェーズを設定
      const testPhase = Phase.createFromDb({
        id: phaseId,
        name: "詳細設計",
        code: new PhaseCode(phaseCode),
        seq: 1,
      });
      mockPhaseRepository.setPhases([testPhase]);
    });

    it("指定されたフェーズが存在しない場合、エラーを投げる", async () => {
      // Arrange
      const nonExistentPhaseId = 999;

      // Act & Assert
      await expect(taskFactory.createTaskId(wbsId, nonExistentPhaseId))
        .rejects
        .toThrow("Phase not found");
    });

    it("フェーズ内にタスクが存在しない場合、初期番号（0001）を返す", async () => {
      // Arrange
      mockTaskRepository.setTasks([]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0001");
    });

    it("フェーズ内に1つのタスクが存在する場合、次の番号（0002）を返す", async () => {
      // Arrange
      const existingTask = Task.createFromDb({
        id: 1,
        name: "既存タスク1",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0001"),
        assigneeId: undefined,
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });
      mockTaskRepository.setTasks([existingTask]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0002");
    });

    it("フェーズ内に複数のタスクが存在する場合、最大番号の次の番号を返す", async () => {
      // Arrange
      const task1 = Task.createFromDb({
        id: 1,
        name: "既存タスク1",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0001"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      const task2 = Task.createFromDb({
        id: 2,
        name: "既存タスク2",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0003"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      const task3 = Task.createFromDb({
        id: 3,
        name: "既存タスク3",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0002"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      mockTaskRepository.setTasks([task1, task2, task3]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0004");
    });

    it("異なるフェーズのタスクは採番に影響しない", async () => {
      // Arrange
      const otherPhaseId = 200;
      const otherPhaseCode = "T1";

      // 他のフェーズを追加
      const otherPhase = Phase.createFromDb({
        id: otherPhaseId,
        name: "テスト",
        code: new PhaseCode(otherPhaseCode),
        seq: 2,
      });
      const currentPhases = mockPhaseRepository["phases"];
      mockPhaseRepository.setPhases([
        ...currentPhases,
        otherPhase
      ]);

      // D1フェーズのタスク
      const d1Task = Task.createFromDb({
        id: 1,
        name: "D1タスク",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0005"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      // T1フェーズのタスク（これは採番に影響しないはず）
      const t1Task = Task.createFromDb({
        id: 2,
        name: "T1タスク",
        wbsId: wbsId,
        phaseId: otherPhaseId,
        taskNo: TaskNo.reconstruct("T1-0010"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      mockTaskRepository.setTasks([d1Task, t1Task]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0006");
    });

    it("異なるWBSのタスクは採番に影響しない", async () => {
      // Arrange
      const otherWbsId = 2;

      // 現在のWBSのD1フェーズのタスク
      const currentWbsTask = Task.createFromDb({
        id: 1,
        name: "現在WBSタスク",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0002"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      // 他のWBSのD1フェーズのタスク（これは採番に影響しないはず）
      const otherWbsTask = Task.createFromDb({
        id: 2,
        name: "他WBSタスク",
        wbsId: otherWbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0099"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      mockTaskRepository.setTasks([currentWbsTask, otherWbsTask]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0003");
    });

    it("TaskNoが4桁の数値でゼロパディングされる", async () => {
      // Arrange
      // 大きな番号のタスクを設定
      const taskWithLargeNumber = Task.createFromDb({
        id: 1,
        name: "大きな番号のタスク",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0999"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      mockTaskRepository.setTasks([taskWithLargeNumber]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-1000");
    });

    it("TaskNoにnullまたはundefinedのタスクは無視される", async () => {
      // Arrange
      const validTask = Task.createFromDb({
        id: 1,
        name: "有効なタスク",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: TaskNo.reconstruct("D1-0003"),
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      const invalidTask = Task.createFromDb({
        id: 2,
        name: "無効なタスク",
        wbsId: wbsId,
        phaseId: phaseId,
        taskNo: undefined as unknown as TaskNo,
        status: new TaskStatus({ status: "NOT_STARTED" }),
      });

      mockTaskRepository.setTasks([validTask, invalidTask]);

      // Act
      const result = await taskFactory.createTaskId(wbsId, phaseId);

      // Assert
      expect(result.getValue()).toBe("D1-0004");
    });
  });
});