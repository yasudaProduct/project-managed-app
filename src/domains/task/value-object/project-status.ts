import { TaskStatus as TaskStatusType } from "@/types/wbs";

export class TaskStatus {
    public readonly status: TaskStatusType;

    constructor(args: { status: TaskStatusType }) {
        this.status = args.status;
    }

    public getStatus(): TaskStatusType {
        return this.status;
    }
}