import { TaskId } from "../value-object/task-id";

export interface ITaskFactory {
    createTaskId(wbsId: number, phaseId: number): Promise<TaskId>;
}