export class WorkRecord {
    public readonly id?: number;
    public readonly userId?: string;
    public readonly taskId?: number;
    public readonly startDate?: Date;
    public readonly endDate?: Date;
    public readonly manHours?: number;

    private constructor(args: { 
        id?: number; 
        userId?: string; 
        taskId?: number; 
        startDate?: Date; 
        endDate?: Date; 
        manHours?: number 
    }) {
        this.id = args.id;
        this.userId = args.userId;
        this.taskId = args.taskId;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.manHours = args.manHours;
    }

    public static create(args: { 
        userId: string; 
        taskId?: number; 
        startDate: Date; 
        endDate: Date; 
        manHours: number 
    }): WorkRecord {
        return new WorkRecord(args);
    }

    public static createFromDb(args: { 
        id: number; 
        userId: string; 
        taskId?: number; 
        startDate: Date; 
        endDate: Date; 
        manHours: number 
    }): WorkRecord {
        return new WorkRecord(args);
    }

    public static createFromGeppo(args: {
        userId: string;
        taskId?: number;
        date: Date;
        hoursWorked: number;
    }): WorkRecord {
        return new WorkRecord({
            userId: args.userId,
            taskId: args.taskId,
            startDate: args.date,
            endDate: args.date,
            manHours: args.hoursWorked
        });
    }
}