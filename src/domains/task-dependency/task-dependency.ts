export class TaskDependency {
    public readonly id?: number;
    public readonly predecessorTaskId: number;
    public readonly successorTaskId: number;
    public readonly wbsId: number;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    private constructor(args: {
        id?: number;
        predecessorTaskId: number;
        successorTaskId: number;
        wbsId: number;
        createdAt?: Date;
        updatedAt?: Date;
    }) {
        this.id = args.id;
        this.predecessorTaskId = args.predecessorTaskId;
        this.successorTaskId = args.successorTaskId;
        this.wbsId = args.wbsId;
        this.createdAt = args.createdAt;
        this.updatedAt = args.updatedAt;
    }

    public static create(args: {
        predecessorTaskId: number;
        successorTaskId: number;
        wbsId: number;
    }): TaskDependency {
        // 基本的なバリデーション
        if (args.predecessorTaskId === args.successorTaskId) {
            throw new Error("タスクは自分自身に依存できません");
        }

        if (args.predecessorTaskId <= 0 || args.successorTaskId <= 0) {
            throw new Error("無効なタスクIDです");
        }

        if (args.wbsId <= 0) {
            throw new Error("無効なWBSIDです");
        }

        return new TaskDependency(args);
    }

    public static createFromDb(args: {
        id: number;
        predecessorTaskId: number;
        successorTaskId: number;
        wbsId: number;
        createdAt: Date;
        updatedAt: Date;
    }): TaskDependency {
        return new TaskDependency(args);
    }

    public isEqual(dependency: TaskDependency): boolean {
        return (
            this.predecessorTaskId === dependency.predecessorTaskId &&
            this.successorTaskId === dependency.successorTaskId
        );
    }

    public isDuplicate(dependencies: TaskDependency[]): boolean {
        return dependencies.some(dep => this.isEqual(dep));
    }
}