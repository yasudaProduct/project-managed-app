import { inject, injectable } from "inversify";
import { TaskDependency, DependencyType } from "@/domains/task-dependency/task-dependency";
import { TaskDependencyValidator } from "@/domains/task-dependency/task-dependency-validator";
import type { ITaskDependencyRepository } from "./itask-dependency-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import { SYMBOL } from "@/types/symbol";

export interface ITaskDependencyService {
    createDependency(args: {
        predecessorTaskId: number;
        successorTaskId: number;
        wbsId: number;
        type?: DependencyType;
        lag?: number;
    }): Promise<TaskDependency>;
    deleteDependency(id: number, wbsId?: number): Promise<void>;
    getDependenciesByWbsId(wbsId: number): Promise<TaskDependency[]>;
    getPredecessorsByTaskId(taskId: number): Promise<TaskDependency[]>;
    getSuccessorsByTaskId(taskId: number): Promise<TaskDependency[]>;
    dependencyExists(predecessorTaskId: number, successorTaskId: number): Promise<boolean>;
    deleteDependenciesByTaskId(taskId: number): Promise<void>;
    canStartTask(taskId: number): Promise<{
        canStart: boolean;
        blockingPredecessors: TaskDependency[];
    }>;
}

@injectable()
export class TaskDependencyService implements ITaskDependencyService {
    constructor(
        @inject(SYMBOL.ITaskDependencyRepository)
        private readonly taskDependencyRepository: ITaskDependencyRepository,
        @inject(SYMBOL.ITaskRepository)
        private readonly taskRepository: ITaskRepository
    ) {}

    /**
     * タスク依存関係を作成する
     */
    async createDependency(args: {
        predecessorTaskId: number;
        successorTaskId: number;
        wbsId: number;
        type?: DependencyType;
        lag?: number;
    }): Promise<TaskDependency> {
        // 新しい依存関係を作成
        const newDependency = TaskDependency.create(args);

        // 同一WBS内のタスクを取得
        const tasksInWbs = await this.taskRepository.findByWbsId(args.wbsId);
        const taskIds = tasksInWbs.map(task => task.id!);

        // 既存の依存関係を取得
        const existingDependencies = await this.taskDependencyRepository.findByWbsId(args.wbsId);

        // バリデーション実行
        TaskDependencyValidator.validate(newDependency, existingDependencies, taskIds);

        // 依存関係を保存
        return await this.taskDependencyRepository.create(newDependency);
    }

    /**
     * 依存関係を削除する。
     *
     * `wbsId` を指定した場合は、対象の依存関係がその WBS に属することを検証する。
     * サーバーアクション/APIは任意の依存IDで直接呼び出せるため、別WBSの依存IDを
     * 渡して削除される（越境削除）のを防ぐスコープチェックとして機能する。
     */
    async deleteDependency(id: number, wbsId?: number): Promise<void> {
        const dependency = await this.taskDependencyRepository.findById(id);
        if (!dependency) {
            throw new Error("指定された依存関係が見つかりません");
        }

        if (wbsId !== undefined && dependency.wbsId !== wbsId) {
            throw new Error("指定された依存関係が見つかりません");
        }

        // 削除可能かチェック
        if (!TaskDependencyValidator.canRemoveDependency()) {
            throw new Error("この依存関係は削除できません");
        }

        await this.taskDependencyRepository.delete(id);
    }

    /**
     * 指定されたWBSの全依存関係を取得する
     */
    async getDependenciesByWbsId(wbsId: number): Promise<TaskDependency[]> {
        return await this.taskDependencyRepository.findByWbsId(wbsId);
    }

    /**
     * 指定されたタスクの先行依存関係を取得する
     */
    async getPredecessorsByTaskId(taskId: number): Promise<TaskDependency[]> {
        return await this.taskDependencyRepository.findPredecessorsByTaskId(taskId);
    }

    /**
     * 指定されたタスクの後続依存関係を取得する
     */
    async getSuccessorsByTaskId(taskId: number): Promise<TaskDependency[]> {
        return await this.taskDependencyRepository.findSuccessorsByTaskId(taskId);
    }

    /**
     * 依存関係が存在するかチェックする
     */
    async dependencyExists(predecessorTaskId: number, successorTaskId: number): Promise<boolean> {
        return await this.taskDependencyRepository.exists(predecessorTaskId, successorTaskId);
    }

    /**
     * タスク削除時に関連する依存関係も削除する
     */
    async deleteDependenciesByTaskId(taskId: number): Promise<void> {
        await this.taskDependencyRepository.deleteByTaskId(taskId);
    }

    /**
     * 依存関係を考慮したタスクの実行可能性をチェックする
     */
    async canStartTask(taskId: number): Promise<{
        canStart: boolean;
        blockingPredecessors: TaskDependency[];
    }> {
        // このタスクの先行依存関係を取得
        const predecessors = await this.getPredecessorsByTaskId(taskId);
        
        if (predecessors.length === 0) {
            return { canStart: true, blockingPredecessors: [] };
        }

        // 完了していない先行タスクをチェック
        const blockingPredecessors: TaskDependency[] = [];
        
        for (const predecessor of predecessors) {
            const predecessorTask = await this.taskRepository.findById(predecessor.predecessorTaskId);
            if (predecessorTask && predecessorTask.getStatus() !== 'COMPLETED') {
                blockingPredecessors.push(predecessor);
            }
        }

        return {
            canStart: blockingPredecessors.length === 0,
            blockingPredecessors
        };
    }
}