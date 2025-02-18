import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { ITaskRepository } from "./itask-repository";
import { WbsTask } from "@/types/wbs";
import { Task } from "@/domains/task/task";
import { TaskStatus } from "@/domains/task/project-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/man-hour-type";
import type { ITaskFactory } from "@/domains/task/interfases/task-factory";


export interface ITaskApplicationService {
    getTaskById(wbsId: number, id: string): Promise<WbsTask | null>;
    getTaskAll(wbsId: number): Promise<WbsTask[]>;
    createTask(args: { name: string; wbsId: number; phaseId: number; yoteiStartDate: Date; yoteiEndDate: Date; yoteiKosu: number; assigneeId?: string; status: TaskStatus }): Promise<{ success: boolean; error?: string; id?: string }>;
    updateTask(args: { wbsId: number; id: string, updateTask: WbsTask }): Promise<{ success: boolean; error?: string; id?: string }>;
    // deleteTask(id: string): Promise<{ success: boolean; error?: string; id?: string }>;
}

@injectable()
export class TaskApplicationService implements ITaskApplicationService {

    constructor(
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.ITaskFactory) private readonly taskFactory: ITaskFactory
    ) {
    }

    public async getTaskById(wbsId: number, id: string): Promise<WbsTask | null> {
        console.log("getTaskById")
        const task = await this.taskRepository.findById(wbsId, id);
        if (!task) return null;
        return {
            id: task.id!.value(),
            name: task.name,
            status: task.getStatus(),
            assigneeId: task.assigneeId ?? undefined,
            assignee: task.assignee ? {
                id: task.assignee.id!,
                name: task.assignee.name,
                displayName: task.assignee.displayName,
            } : undefined,
            phaseId: task.phaseId ?? undefined,
            phase: task.phase ? {
                id: task.phase.id!,
                name: task.phase.name,
                seq: task.phase.seq,
            } : undefined,
            kijunStart: task.getKijunStart(),
            kijunEnd: task.getKijunEnd(),
            kijunKosu: task.getKijunKosus(),
            yoteiStart: task.getYoteiStart(),
            yoteiEnd: task.getYoteiEnd(),
            yoteiKosu: task.getYoteiKosus(),
            jissekiStart: task.getJissekiStart(),
            jissekiEnd: task.getJissekiEnd(),
            jissekiKosu: task.getJissekiKosus(),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }

    public async getTaskAll(wbsId: number): Promise<WbsTask[]> {
        const tasks = await this.taskRepository.findAll(wbsId);

        return tasks.map(task => ({
            id: task.id!.value(),
            name: task.name,
            status: task.getStatus(),
            assigneeId: task.assigneeId ?? undefined,
            assignee: task.assignee ? {
                id: task.assignee.id!,
                name: task.assignee.name,
                displayName: task.assignee.displayName,
            } : undefined,
            phaseId: task.phaseId ?? undefined,
            phase: task.phase ? {
                id: task.phase.id!,
                name: task.phase.name,
                seq: task.phase.seq,
            } : undefined,
            kijunStart: task.getKijunStart(),
            kijunEnd: task.getKijunEnd(),
            kijunKosu: task.getKijunKosus(),
            yoteiStart: task.getYoteiStart(),
            yoteiEnd: task.getYoteiEnd(),
            yoteiKosu: task.getYoteiKosus(),
            jissekiStart: task.getJissekiStart(),
            jissekiEnd: task.getJissekiEnd(),
            jissekiKosu: task.getJissekiKosus(),
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        }));
    }

    public async createTask(args: {
        name: string;
        wbsId: number;
        phaseId: number;
        yoteiStartDate: Date;
        yoteiEndDate: Date;
        yoteiKosu: number;
        assigneeId?: string;
        status: TaskStatus
    }): Promise<{ success: boolean; error?: string; id?: string }> {
        console.log("service: createTask")
        const { name, wbsId, phaseId, yoteiStartDate, yoteiEndDate, yoteiKosu, assigneeId, status } = args;

        //TODO ファクトリーでtaskを生成する
        const task = Task.create(
            {
                id: await this.taskFactory.createTaskId(wbsId, phaseId),
                wbsId,
                name,
                phaseId,
                assigneeId,
                status,
                periods: [
                    Period.create({
                        startDate: yoteiStartDate,
                        endDate: yoteiEndDate,
                        type: new PeriodType({ type: "YOTEI" }),
                        manHours: [
                            ManHour.create({
                                kosu: yoteiKosu,
                                type: new ManHourType({ type: "NORMAL" }),
                            })
                        ]
                    })
                ]

            }
        );

        const result = await this.taskRepository.create(task);
        return { success: true, id: result.id!.value() };
    }

    public async updateTask(args: { wbsId: number, id: string, updateTask: WbsTask }): Promise<{ success: boolean; error?: string; id?: string }> {
        console.log("service: updateTask")
        const { wbsId, id, updateTask } = args;

        const task: Task | null = await this.taskRepository.findById(wbsId, id);
        if (!task) {
            return { success: false, error: "タスクが見つかりません" };
        }

        // 重複確認 ドメインサービス
        // タスク名が重複しているか確認
        // const tasks = await this.taskRepository.findAll(task.wbsId);
        // if (tasks.some(t => t.name === updateTask.name)) {
        //     return { success: false, error: "タスク名が重複しています" };
        // }

        task.update({
            // id: updateTask.id,
            name: updateTask.name,
            assigneeId: updateTask.assigneeId,
            phaseId: updateTask.phaseId,
            status: new TaskStatus({ status: updateTask.status }),
        });
        if (updateTask.kijunStart) task.updateKijun(updateTask.kijunStart, updateTask.kijunEnd ?? updateTask.kijunStart, updateTask.kijunKosu ?? 0);
        if (updateTask.yoteiStart) task.updateYotei({ startDate: updateTask.yoteiStart, endDate: updateTask.yoteiEnd ?? updateTask.yoteiStart, kosu: updateTask.yoteiKosu ?? 0 });

        const result = await this.taskRepository.update(wbsId, id, task);
        return { success: true, id: result.id!.value() };

    }
}
