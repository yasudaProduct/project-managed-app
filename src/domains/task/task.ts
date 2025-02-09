import { Assignee } from "./assignee";
import { Phase } from "../phase/phase";
import { TaskStatus } from "./project-status";
import { Period } from "./period";
import { TaskStatus as TaskStatusType } from "@/types/wbs";
import { ManHour } from "./man-hour";
import { ManHourType } from "./man-hour-type";
import { PeriodType } from "./period-type";


export class Task {
    public readonly id?: string;
    public wbsId: number;
    public name: string;
    public status: TaskStatus;
    public phaseId?: number;
    public phase?: Phase;
    public assigneeId?: string;
    public assignee?: Assignee;
    public periods?: Period[];
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    private constructor(args: {
        id?: string;
        wbsId: number;
        name: string;
        assigneeId?: string;
        status: TaskStatus;
        phaseId?: number;
        phase?: Phase;
        assignee?: Assignee;
        periods?: Period[];
        createdAt?: Date;
        updatedAt?: Date;
    }) {
        this.id = args.id;
        this.wbsId = args.wbsId;
        this.name = args.name;
        this.assigneeId = args.assigneeId;
        this.status = args.status;
        this.phaseId = args.phaseId;
        this.phase = args.phase;
        this.assignee = args.assignee;
        this.periods = args.periods;
        this.createdAt = args.createdAt;
        this.updatedAt = args.updatedAt;
    }

    public isEqual(task: Task) {
        return this.id === task.id;
    }

    public static create(args: { wbsId: number; name: string; assigneeId?: string; status: TaskStatus; phaseId?: number; phase?: Phase; assignee?: Assignee; periods?: Period[]; }): Task {
        return new Task(args);
    }

    public static createFromDb(args:
        {
            id: string;
            wbsId: number;
            name: string;
            status: TaskStatus;
            assigneeId?: string;
            assignee?: Assignee;
            phaseId?: number;
            phase?: Phase;
            periods?: Period[];
            createdAt?: Date;
            updatedAt?: Date;
        }): Task {
        return new Task(args);
    }

    public getStatus(): TaskStatusType {
        return this.status.getStatus();
    }

    public updateName(name: string) {
        this.name = name;
    }

    public updateAssigneeId(assigneeId: string) {
        this.assigneeId = assigneeId;
    }

    public updatePhaseId(phaseId: number) {
        this.phaseId = phaseId;
    }

    public updateStatus(status: TaskStatusType) {
        this.status = new TaskStatus({ status });
    }

    public updateKijun(kijunStart: Date, kijunEnd: Date, kijunKosu: number) {
        const period = this.periods?.findLast(
            p => p.type.type === 'KIJUN'
        );

        if (period) {
            period.startDate = kijunStart;
            period.endDate = kijunEnd;

            const manHour = period.manHours.findLast(
                m => m.type.type === 'NORMAL'
            );
            if (manHour) {
                manHour.kosu = kijunKosu;
            } else {
                period.manHours.push(ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu: kijunKosu }));
            }

        } else {
            this.periods?.push(Period.create({ type: new PeriodType({ type: 'KIJUN' }), startDate: kijunStart, endDate: kijunStart, manHours: [] }));
        }
    }


    public getKijunStart(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'KIJUN'
        )?.startDate;
    }

    public getKijunEnd(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'KIJUN'
        )?.endDate;
    }

    public getKijunKosus(): number | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'KIJUN'
        )?.manHours.findLast(
            k => k.type.type === 'NORMAL'
        )?.kosu;
    }

    public getYoteiStart(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'YOTEI'
        )?.startDate;
    }

    public getYoteiEnd(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'YOTEI'
        )?.endDate;
    }

    public getYoteiKosus(): number | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'YOTEI'
        )?.manHours.findLast(
            k => k.type.type === 'NORMAL'
        )?.kosu;
    }

    public getJissekiStart(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'JISSEKI'
        )?.startDate;
    }

    public getJissekiEnd(): Date | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'JISSEKI'
        )?.endDate;
    }

    public getJissekiKosus(): number | undefined {
        return this.periods?.findLast(
            p => p.type.type === 'JISSEKI'
        )?.manHours.findLast(
            k => k.type.type === 'NORMAL'
        )?.kosu;
    }
}