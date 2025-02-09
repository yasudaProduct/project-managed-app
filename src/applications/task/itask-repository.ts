import { Task } from "../../domains/task/task";

export interface ITaskRepository {
    findById(id: string): Promise<Task | null>;
    findAll(wbsId: number): Promise<Task[]>;
    create(task: Task): Promise<Task>;
    update(id: string, task: Task): Promise<Task>;
    delete(id: string): Promise<void>;
}