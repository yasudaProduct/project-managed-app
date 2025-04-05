import { TaskId } from "../task-id";

export interface ITaskFactory {
    createTaskId(wbsId: number, phaseId: number): Promise<TaskId>;
}