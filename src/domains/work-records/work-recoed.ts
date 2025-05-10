export class WorkRecord {
    public readonly id?: number;
    public readonly taskId?: number;
    public readonly startDate?: Date;
    public readonly endDate?: Date;
    public readonly manHours?: number;

    private constructor(args: { id?: number; taskId?: number; startDate?: Date; endDate?: Date; manHours?: number }) {
        this.id = args.id;
        this.taskId = args.taskId;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.manHours = args.manHours;
    }

    public static create(args: { taskId: number; startDate: Date; endDate: Date; manHours: number }): WorkRecord {
        return new WorkRecord(args);
    }

    public static createFromDb(args: { id: number; taskId: number; startDate: Date; endDate: Date; manHours: number }): WorkRecord {
        return new WorkRecord(args);
    }

}