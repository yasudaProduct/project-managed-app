import { ITaskFactory } from "@/domains/task/interfases/task-factory";
import { TaskId } from "@/domains/task/task-id";
import { inject, injectable } from "inversify";
import type { ITaskRepository } from "./itask-repository";
import { SYMBOL } from "@/types/symbol";


@injectable()
export class TaskFactory implements ITaskFactory {
    constructor(@inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository) {
    }

    async createTaskId(wbsId: number, processCode: string): Promise<TaskId> {

        // 最新のタスクIDを取得
        const lastTask = (await this.taskRepository.findAll(wbsId)).findLast(
            (task) => task.id?.value().startsWith(processCode)
        );

        let nextNumber = 1;
        if (lastTask) {
            const lastNumber = parseInt(lastTask.id!.value().split("-")[1] ?? "0", 10);
            nextNumber = lastNumber + 1;
        }

        const newTaskId = `${processCode}-${String(nextNumber).padStart(4, "0")}`;
        return new TaskId(newTaskId);
    }
}
