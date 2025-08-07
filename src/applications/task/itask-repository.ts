import { Task } from "../../domains/task/task";

export interface ITaskRepository {
    findById(id: number): Promise<Task | null>;
    findAll(wbsId?: number): Promise<Task[]>;
    findByWbsId(wbsId: number): Promise<Task[]>;
    findByAssigneeId(assigneeId: number): Promise<Task[]>;
    create(task: Task): Promise<Task>;
    update(wbsId: number, task: Task): Promise<Task>;
    delete(id: number): Promise<void>;
}