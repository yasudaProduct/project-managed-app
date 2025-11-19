import { Assignee } from "./assignee";
import { Phase } from "../phase/phase";
import { TaskStatus } from "./value-object/project-status";
import { Period } from "./period";
import { TaskStatus as TaskStatusType } from "@/types/wbs";
import { ManHour } from "./man-hour";
import { ManHourType } from "./value-object/man-hour-type";
import { PeriodType } from "./value-object/period-type";
import { TaskNo } from "./value-object/task-id";
import { WorkRecord } from "../work-records/work-recoed";

export class Task {
    public id?: number;
    public taskNo: TaskNo;
    public wbsId: number;
    public name: string;
    public status: TaskStatus;
    public phaseId?: number;
    public phase?: Phase;
    public assigneeId?: number;
    public assignee?: Assignee;
    public periods?: Period[];
    public workRecords?: WorkRecord[];
    public progressRate?: number;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;

    private constructor(args: {
        id?: number;
        taskNo: TaskNo;
        wbsId: number;
        name: string;
        assigneeId?: number;
        status: TaskStatus;
        phaseId?: number;
        phase?: Phase;
        assignee?: Assignee;
        periods?: Period[];
        workRecords?: WorkRecord[];
        progressRate?: number;
        createdAt?: Date;
        updatedAt?: Date;
    }) {
        this.id = args.id;
        this.taskNo = args.taskNo;
        this.wbsId = args.wbsId;
        this.name = args.name;
        this.assigneeId = args.assigneeId;
        this.status = args.status;
        this.phaseId = args.phaseId;
        this.phase = args.phase;
        this.assignee = args.assignee;
        this.periods = args.periods;
        this.workRecords = args.workRecords;
        this.progressRate = args.progressRate;
        this.createdAt = args.createdAt;
        this.updatedAt = args.updatedAt;
    }

    public static create(args: {
        taskNo: TaskNo;
        wbsId: number;
        name: string;
        phaseId?: number;
        assigneeId?: number;
        status: TaskStatus;
        periods?: Period[];
        progressRate?: number;
    }): Task {
        return new Task(args);
    }

    public static createFromDb(args:
        {
            id: number;
            taskNo: TaskNo;
            wbsId: number;
            name: string;
            status: TaskStatus;
            assigneeId?: number;
            assignee?: Assignee;
            phaseId?: number;
            phase?: Phase;
            periods?: Period[];
            workRecords?: WorkRecord[];
            progressRate?: number;
            createdAt?: Date;
            updatedAt?: Date;
        }): Task {
        return new Task(args);
    }

    public update(args: { name: string; assigneeId?: number; status: TaskStatus; phaseId?: number; periods?: Period[]; }) {

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

    public getKijunStart(): Date | undefined {
        // TODO: 同一typeが複数ある想定ある？バリデーションを設けておくべきかも
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
        // 最小のstartDateを取得
        return this.workRecords?.sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())
            .findLast(w => w.startDate)?.startDate;
    }

    public getJissekiEnd(): Date | undefined {
        return this.workRecords?.sort((a, b) => (a.endDate?.getTime() ?? 0) - (b.endDate?.getTime() ?? 0))
            .findLast(w => w.endDate)?.endDate;
    }

    public getJissekiKosus(): number | undefined {
        return this.workRecords?.reduce((acc, workRecord) => acc + (workRecord.manHours ?? 0), 0);
    }
}