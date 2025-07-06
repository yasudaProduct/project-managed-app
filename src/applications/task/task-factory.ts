import { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { inject, injectable } from "inversify";
import type { ITaskRepository } from "./itask-repository";
import { SYMBOL } from "@/types/symbol";
import type { IPhaseRepository } from "./iphase-repository";


@injectable()
export class TaskFactory implements ITaskFactory {
    constructor(
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.IPhaseRepository) private readonly phaseRepository: IPhaseRepository) {
    }

    async createTaskId(wbsId: number, phaseId: number): Promise<TaskNo> {

        const wbsPhase = await this.phaseRepository.findById(phaseId);
        if (!wbsPhase) {
            throw new Error("Phase not found");
        }

        // 指定されたPhase内の最新のタスクIDを取得
        const allTasks = await this.taskRepository.findAll(wbsId);
        const phaseTasks = allTasks.filter(
            (task) => task.phaseId === phaseId && task.taskNo?.getValue().startsWith(wbsPhase.code.value())
        );
        
        // タスクNo順でソートし、最後のタスクを取得
        const lastTask = phaseTasks
            .sort((a, b) => {
                const aNum = parseInt(a.taskNo!.getValue().split("-")[1] ?? "0", 10);
                const bNum = parseInt(b.taskNo!.getValue().split("-")[1] ?? "0", 10);
                return aNum - bNum;
            })
            .pop();

        let nextNumber = 1;
        if (lastTask) {
            const lastNumber = parseInt(lastTask.taskNo!.getValue().split("-")[1] ?? "0", 10);
            nextNumber = lastNumber + 1;
        }

        return TaskNo.create(wbsPhase.code.value(), nextNumber);
    }
}
