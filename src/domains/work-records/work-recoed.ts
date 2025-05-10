import { TaskId } from "../task/value-object/task-id";

export class WorkRecord {
    public readonly id?: number;
    public readonly taskId?: TaskId;
    public readonly startDate?: Date;
    public readonly endDate?: Date;
    public readonly manHours?: number;

    private constructor(args: { id?: number; taskId?: TaskId; startDate?: Date; endDate?: Date; manHours?: number }) {
        this.id = args.id;
        this.taskId = args.taskId;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.manHours = args.manHours;
    }

    public static create(args: { taskId: TaskId; startDate: Date; endDate: Date; manHours: number }): WorkRecord {
        return new WorkRecord(args);
    }

    public static createFromDb(args: { id: number; taskId: TaskId; startDate: Date; endDate: Date; manHours: number }): WorkRecord {
        return new WorkRecord(args);
    }

}