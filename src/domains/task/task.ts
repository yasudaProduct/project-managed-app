import { Assignee } from "./assignee";
import { Phase } from "../phase/phase";
import { TaskStatus } from "./project-status";
import { Period } from "./period";
import { TaskStatus as TaskStatusType } from "@/types/wbs";
import { ManHour } from "./man-hour";
import { ManHourType } from "./man-hour-type";
import { PeriodType } from "./period-type";


export class Task {
    public id?: string;
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

    public static create(args: {
        wbsId: number;
        name: string;
        phaseId?: number;
        assigneeId?: string;
        status: TaskStatus;
        periods?: Period[];
    }): Task {
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

    public update(args: { name: string; assigneeId?: string; status: TaskStatus; phaseId?: number; periods?: Period[]; }) {

        if (!args.name) {
            throw new Error("タスク名は必須です");
        }

        if (!args.status) {
            throw new Error("タスクステータスは必須です");
        }

        if (!args.assigneeId) {
            throw new Error("担当者は必須です");
        }

        if (!args.phaseId) {
            throw new Error("フェーズは必須です");
        }

        this.name = args.name;
        this.assigneeId = args.assigneeId;
        this.status = args.status;
        this.phaseId = args.phaseId;
    }

    public updateYotei(args: { startDate: Date; endDate: Date; kosu: number }) {

        // 自身の期間モデルを取得
        const period = this.periods?.findLast(
            p => p.type.type === 'YOTEI'
        );
        console.log(period);

        if (period) {
            // 期間モデルが存在する場合
            period.startDate = args.startDate;
            period.endDate = args.endDate;

            // 工数モデルを取得
            const manHour = period.manHours.findLast(
                m => m.type.type === 'NORMAL'
            );

            // 工数モデルが存在する場合
            if (manHour) {
                manHour.kosu = args.kosu;
            } else {
                period.manHours.push(ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu: args.kosu }));
            }
        } else {
            // 期間モデルが存在しない場合
            const manHour = ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu: args.kosu });
            this.periods?.push(Period.create({ type: new PeriodType({ type: 'YOTEI' }), startDate: args.startDate, endDate: args.endDate, manHours: [manHour] }));
            console.log(this.periods);
        }
    }

    public getStatus(): TaskStatusType {
        return this.status.getStatus();
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