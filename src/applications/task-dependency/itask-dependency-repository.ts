import { TaskDependency } from "@/domains/task-dependency/task-dependency";

interface ITaskDependencyRepository {
    /**
     * タスク依存関係を作成する
     */
    create(dependency: TaskDependency): Promise<TaskDependency>;

    /**
     * 指定されたIDの依存関係を取得する
     */
    findById(id: number): Promise<TaskDependency | null>;

    /**
     * 指定されたWBSの全依存関係を取得する
     */
    findByWbsId(wbsId: number): Promise<TaskDependency[]>;

    /**
     * 指定されたタスクの先行依存関係を取得する（このタスクが後続タスクとなる依存関係）
     */
    findPredecessorsByTaskId(taskId: number): Promise<TaskDependency[]>;

    /**
     * 指定されたタスクの後続依存関係を取得する（このタスクが先行タスクとなる依存関係）
     */
    findSuccessorsByTaskId(taskId: number): Promise<TaskDependency[]>;

    /**
     * 依存関係を削除する
     */
    delete(id: number): Promise<void>;

    /**
     * 指定されたタスクに関連する全依存関係を削除する
     */
    deleteByTaskId(taskId: number): Promise<void>;

    /**
     * 特定の依存関係が存在するかチェックする
     */
    exists(predecessorTaskId: number, successorTaskId: number): Promise<boolean>;
}

export type { ITaskDependencyRepository };