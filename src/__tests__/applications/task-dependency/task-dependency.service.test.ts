import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import type { ITaskDependencyRepository } from "@/applications/task-dependency/itask-dependency-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import { TaskDependency } from "@/domains/task-dependency/task-dependency";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";

// モックリポジトリ
const mockTaskDependencyRepository: jest.Mocked<ITaskDependencyRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByWbsId: jest.fn(),
    findPredecessorsByTaskId: jest.fn(),
    findSuccessorsByTaskId: jest.fn(),
    delete: jest.fn(),
    deleteByTaskId: jest.fn(),
    exists: jest.fn(),
};

const mockTaskRepository: jest.Mocked<ITaskRepository> = {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWbsId: jest.fn(),
    findByAssigneeId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

describe('TaskDependencyService', () => {
    let service: TaskDependencyService;

    beforeEach(() => {
        // モックをリセット
        jest.clearAllMocks();
        
        service = new TaskDependencyService(
            mockTaskDependencyRepository,
            mockTaskRepository
        );
    });

    describe('createDependency', () => {
        const tasksInWbs = [
            Task.createFromDb({
                id: 1,
                taskNo: TaskNo.reconstruct("T-0001"),
                wbsId: 1,
                name: "Task 1",
                status: new TaskStatus({ status: "NOT_STARTED" }),
            }),
            Task.createFromDb({
                id: 2,
                taskNo: TaskNo.reconstruct("T-0002"),
                wbsId: 1,
                name: "Task 2",
                status: new TaskStatus({ status: "NOT_STARTED" }),
            }),
        ];

        beforeEach(() => {
            mockTaskRepository.findByWbsId.mockResolvedValue(tasksInWbs);
            mockTaskDependencyRepository.findByWbsId.mockResolvedValue([]);
        });

        test('正常な依存関係を作成できる', async () => {
            const newDependency = TaskDependency.createFromDb({
                id: 1,
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            mockTaskDependencyRepository.create.mockResolvedValue(newDependency);

            const result = await service.createDependency({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
            });

            expect(mockTaskRepository.findByWbsId).toHaveBeenCalledWith(1);
            expect(mockTaskDependencyRepository.findByWbsId).toHaveBeenCalledWith(1);
            expect(mockTaskDependencyRepository.create).toHaveBeenCalled();
            expect(result).toBe(newDependency);
        });

        test('循環参照がある場合はエラーになる', async () => {
            const existingDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
            });

            mockTaskDependencyRepository.findByWbsId.mockResolvedValue([existingDependency]);

            await expect(service.createDependency({
                predecessorTaskId: 2,
                successorTaskId: 1,
                wbsId: 1,
            })).rejects.toThrow('循環参照が発生するため、この依存関係は設定できません');
        });

        test('同一WBS内にないタスクの場合はエラーになる', async () => {
            await expect(service.createDependency({
                predecessorTaskId: 10, // WBS内にないタスク
                successorTaskId: 2,
                wbsId: 1,
            })).rejects.toThrow('先行タスクが同一WBS内に存在しません');
        });
    });

    describe('deleteDependency', () => {
        test('存在する依存関係を削除できる', async () => {
            const dependency = TaskDependency.createFromDb({
                id: 1,
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            mockTaskDependencyRepository.findById.mockResolvedValue(dependency);
            mockTaskDependencyRepository.findByWbsId.mockResolvedValue([dependency]);

            await service.deleteDependency(1);

            expect(mockTaskDependencyRepository.findById).toHaveBeenCalledWith(1);
            expect(mockTaskDependencyRepository.delete).toHaveBeenCalledWith(1);
        });

        test('存在しない依存関係を削除しようとするとエラーになる', async () => {
            mockTaskDependencyRepository.findById.mockResolvedValue(null);

            await expect(service.deleteDependency(1))
                .rejects.toThrow('指定された依存関係が見つかりません');
        });
    });

    describe('canStartTask', () => {
        test('先行依存関係がない場合は開始可能', async () => {
            mockTaskDependencyRepository.findPredecessorsByTaskId.mockResolvedValue([]);

            const result = await service.canStartTask(1);

            expect(result.canStart).toBe(true);
            expect(result.blockingPredecessors).toHaveLength(0);
        });

        test('先行タスクが完了している場合は開始可能', async () => {
            const predecessorDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
            });

            const completedTask = Task.createFromDb({
                id: 1,
                taskNo: TaskNo.reconstruct("T-0001"),
                wbsId: 1,
                name: "Task 1",
                status: new TaskStatus({ status: "COMPLETED" }),
            });

            mockTaskDependencyRepository.findPredecessorsByTaskId.mockResolvedValue([predecessorDependency]);
            mockTaskRepository.findById.mockResolvedValue(completedTask);

            const result = await service.canStartTask(2);

            expect(result.canStart).toBe(true);
            expect(result.blockingPredecessors).toHaveLength(0);
        });

        test('先行タスクが未完了の場合は開始不可', async () => {
            const predecessorDependency = TaskDependency.create({
                predecessorTaskId: 1,
                successorTaskId: 2,
                wbsId: 1,
            });

            const incompleteTask = Task.createFromDb({
                id: 1,
                taskNo: TaskNo.reconstruct("T-0001"),
                wbsId: 1,
                name: "Task 1",
                status: new TaskStatus({ status: "IN_PROGRESS" }),
            });

            mockTaskDependencyRepository.findPredecessorsByTaskId.mockResolvedValue([predecessorDependency]);
            mockTaskRepository.findById.mockResolvedValue(incompleteTask);

            const result = await service.canStartTask(2);

            expect(result.canStart).toBe(false);
            expect(result.blockingPredecessors).toHaveLength(1);
            expect(result.blockingPredecessors[0]).toBe(predecessorDependency);
        });
    });

    describe('getDependenciesByWbsId', () => {
        test('WBSの依存関係一覧を取得できる', async () => {
            const dependencies = [
                TaskDependency.create({
                    predecessorTaskId: 1,
                    successorTaskId: 2,
                    wbsId: 1,
                }),
            ];

            mockTaskDependencyRepository.findByWbsId.mockResolvedValue(dependencies);

            const result = await service.getDependenciesByWbsId(1);

            expect(mockTaskDependencyRepository.findByWbsId).toHaveBeenCalledWith(1);
            expect(result).toBe(dependencies);
        });
    });

    describe('dependencyExists', () => {
        test('存在する依存関係の場合はtrueを返す', async () => {
            mockTaskDependencyRepository.exists.mockResolvedValue(true);

            const result = await service.dependencyExists(1, 2);

            expect(mockTaskDependencyRepository.exists).toHaveBeenCalledWith(1, 2);
            expect(result).toBe(true);
        });

        test('存在しない依存関係の場合はfalseを返す', async () => {
            mockTaskDependencyRepository.exists.mockResolvedValue(false);

            const result = await service.dependencyExists(1, 2);

            expect(mockTaskDependencyRepository.exists).toHaveBeenCalledWith(1, 2);
            expect(result).toBe(false);
        });
    });
});