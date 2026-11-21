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

        // taskNo の一意制約は (taskNo, wbsId) で工程は関係しない。
        // 工程変更で他工程へ移ったタスクや論理削除済みタスクも番号を使っているため、
        // 工程では絞らず WBS 内（論理削除込み）の同じ工程コードの番号を対象にする。
        // 区切りの "-" まで含めて判定し、D1 と D10 を区別する。
        const taskNoPrefix = `${wbsPhase.code.value()}-`;
        const allTasks = await this.taskRepository.findIncludingDeletedByWbsId(wbsId);
        const phaseTasks = allTasks.filter(
            (task) => task.taskNo?.getValue().startsWith(taskNoPrefix)
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
