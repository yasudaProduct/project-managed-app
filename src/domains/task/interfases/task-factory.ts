import { TaskId } from "../task-id";

export interface ITaskFactory {
    createTaskId(wbsId: number, code: string): Promise<TaskId>;
}