import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { ITaskRepository } from "./itask-repository";
import { WbsTask } from "@/types/wbs";


export interface ITaskApplicationService {
    getTaskById(id: string): Promise<WbsTask | null>;
    getTaskAll(wbsId: number): Promise<WbsTask[]>;
    // createTask(args: { name: string; wbsId: number; assigneeId?: string; status: TaskStatus }): Promise<{ success: boolean; error?: string; id?: string }>;
    // updateTask(args: { id: string; name?: string; assigneeId?: string; status?: TaskStatus }): Promise<{ success: boolean; error?: string; id?: string }>;
    // deleteTask(id: string): Promise<{ success: boolean; error?: string; id?: string }>;
}

@injectable()
export class TaskApplicationService implements ITaskApplicationService {

    constructor(@inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository) {
    }

    public async getTaskById(id: string): Promise<WbsTask | null> {
        const task = await this.taskRepository.findById(id);
        if (!task) return null;
        return {
            id: task.id!,
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
            id: task.id!,
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
}
