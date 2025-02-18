import { ITaskFactory } from "@/domains/task/interfases/task-factory";
import { TaskId } from "@/domains/task/task-id";
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

    async createTaskId(wbsId: number, phaseId: number): Promise<TaskId> {

        const wbsPhase = await this.phaseRepository.findById(phaseId);
        if (!wbsPhase) {
            throw new Error("Phase not found");
        }

        // 最新のタスクIDを取得
        // TODO wbsPhaseのIDを条件に最大値を取得する
        const lastTask = (await this.taskRepository.findAll(wbsId)).findLast(
            (task) => task.id?.value().startsWith(wbsPhase.code.value())
        );

        let nextNumber = 1;
        if (lastTask) {
            const lastNumber = parseInt(lastTask.id!.value().split("-")[1] ?? "0", 10);
            nextNumber = lastNumber + 1;
        }

        const newTaskId = `${wbsPhase.code.value()}-${String(nextNumber).padStart(4, "0")}`;
        return new TaskId(newTaskId);
    }
}
