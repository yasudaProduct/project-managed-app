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

    public isEqual(task: Task) {
        return this.taskNo === task.taskNo;
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
            const manHour = ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu: kijunKosu });
            this.periods?.push(Period.create({ type: new PeriodType({ type: 'KIJUN' }), startDate: kijunStart, endDate: kijunEnd, manHours: [manHour] }));
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
        return this.workRecords?.findLast(
            w => w.startDate
        )?.startDate;
    }

    public getJissekiEnd(): Date | undefined {
        return this.workRecords?.findLast(
            w => w.endDate
        )?.endDate;
    }

    public getJissekiKosus(): number | undefined {
        return this.workRecords?.reduce((acc, workRecord) => acc + (workRecord.manHours ?? 0), 0);
    }

    /**
     * タスクの進捗率を取得（完了ステータス優先）
     */
    public getProgressRate(): number {
        // 完了ステータスの場合は必ず100%を返す
        if (this.status.getStatus() === 'COMPLETED') {
            return 100;
        }

        // 完了以外の場合は、データベースの値またはステータスベースの値を使用
        if (this.progressRate !== undefined && this.progressRate !== null) {
            return this.progressRate;
        }

        // フォールバック: ステータスベースの進捗率
        switch (this.status.getStatus()) {
            case 'NOT_STARTED':
                return 0;
            case 'IN_PROGRESS':
                return 50;
            case 'ON_HOLD':
                return 0;
            default:
                return 0;
        }
    }

    /**
     * タスクリストから進捗集計を計算
     */
    public static calculateAggregation(tasks: Task[]): TaskAggregation {
        const totalTaskCount = tasks.length;
        const completedCount = tasks.filter(task => task.status.getStatus() === 'COMPLETED').length;
        const inProgressCount = tasks.filter(task => task.status.getStatus() === 'IN_PROGRESS').length;
        const notStartedCount = tasks.filter(task => task.status.getStatus() === 'NOT_STARTED').length;

        const completionRate = totalTaskCount === 0 ? 0 : (completedCount / totalTaskCount) * 100;

        const plannedManHours = tasks.reduce((sum, task) => sum + (task.getYoteiKosus() || 0), 0);
        const actualManHours = tasks.reduce((sum, task) => sum + (task.getJissekiKosus() || 0), 0);
        const varianceManHours = actualManHours - plannedManHours;

        // フェーズ別集計
        const phaseAggregations = Task.calculatePhaseAggregations(tasks);

        // 担当者別集計
        const assigneeAggregations = Task.calculateAssigneeAggregations(tasks);

        return {
            totalTaskCount,
            completedCount,
            inProgressCount,
            notStartedCount,
            completionRate,
            plannedManHours,
            actualManHours,
            varianceManHours,
            phaseAggregations,
            assigneeAggregations,
        };
    }

    private static calculatePhaseAggregations(tasks: Task[]): PhaseAggregation[] {
        const phaseGroups = new Map<string, Task[]>();

        tasks.forEach(task => {
            const key = `${task.phaseId || 'undefined'}|${task.phase?.name || 'undefined'}`;
            const group = phaseGroups.get(key) || [];
            group.push(task);
            phaseGroups.set(key, group);
        });

        return Array.from(phaseGroups.entries()).map(([key, phaseTasks]) => {
            const [phaseId, phaseName] = key.split('|');
            const taskCount = phaseTasks.length;
            const completedCount = phaseTasks.filter(task => task.status.getStatus() === 'COMPLETED').length;
            const plannedManHours = phaseTasks.reduce((sum, task) => sum + (task.getYoteiKosus() || 0), 0);
            const actualManHours = phaseTasks.reduce((sum, task) => sum + (task.getJissekiKosus() || 0), 0);
            const completionRate = taskCount === 0 ? 0 : (completedCount / taskCount) * 100;

            return {
                phaseId: phaseId === 'undefined' ? undefined : parseInt(phaseId),
                phaseName: phaseName === 'undefined' ? undefined : phaseName,
                taskCount,
                completedCount,
                plannedManHours,
                actualManHours,
                completionRate,
            };
        });
    }

    private static calculateAssigneeAggregations(tasks: Task[]): AssigneeAggregation[] {
        const assigneeGroups = new Map<string, Task[]>();

        tasks.forEach(task => {
            const key = `${task.assigneeId || 'undefined'}|${task.assignee?.name || 'undefined'}`;
            const group = assigneeGroups.get(key) || [];
            group.push(task);
            assigneeGroups.set(key, group);
        });

        return Array.from(assigneeGroups.entries()).map(([key, assigneeTasks]) => {
            const [assigneeId, assigneeName] = key.split('|');
            const taskCount = assigneeTasks.length;
            const completedCount = assigneeTasks.filter(task => task.status.getStatus() === 'COMPLETED').length;
            const plannedManHours = assigneeTasks.reduce((sum, task) => sum + (task.getYoteiKosus() || 0), 0);
            const actualManHours = assigneeTasks.reduce((sum, task) => sum + (task.getJissekiKosus() || 0), 0);
            const completionRate = taskCount === 0 ? 0 : (completedCount / taskCount) * 100;

            return {
                assigneeId: assigneeId === 'undefined' ? undefined : parseInt(assigneeId),
                assigneeName: assigneeName === 'undefined' ? undefined : assigneeName,
                taskCount,
                completedCount,
                plannedManHours,
                actualManHours,
                completionRate,
            };
        });
    }
}

// 集計結果の型定義
export interface TaskAggregation {
    totalTaskCount: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    completionRate: number;
    plannedManHours: number;
    actualManHours: number;
    varianceManHours: number;
    phaseAggregations: PhaseAggregation[];
    assigneeAggregations: AssigneeAggregation[];
}

export interface PhaseAggregation {
    phaseId?: number;
    phaseName?: string;
    taskCount: number;
    completedCount: number;
    plannedManHours: number;
    actualManHours: number;
    completionRate: number;
}

export interface AssigneeAggregation {
    assigneeId?: number;
    assigneeName?: string;
    taskCount: number;
    completedCount: number;
    plannedManHours: number;
    actualManHours: number;
    completionRate: number;
}