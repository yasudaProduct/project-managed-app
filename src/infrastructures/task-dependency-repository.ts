import { injectable } from "inversify";
import type { ITaskDependencyRepository } from "@/applications/task-dependency/itask-dependency-repository";
import { TaskDependency } from "@/domains/task-dependency/task-dependency";
import prisma from "@/lib/prisma";

@injectable()
export class TaskDependencyRepository implements ITaskDependencyRepository {
    
    async create(dependency: TaskDependency): Promise<TaskDependency> {
        const created = await prisma.taskDependency.create({
            data: {
                predecessorTaskId: dependency.predecessorTaskId,
                successorTaskId: dependency.successorTaskId,
                wbsId: dependency.wbsId,
            },
        });

        return TaskDependency.createFromDb({
            id: created.id,
            predecessorTaskId: created.predecessorTaskId,
            successorTaskId: created.successorTaskId,
            wbsId: created.wbsId,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
        });
    }

    async findById(id: number): Promise<TaskDependency | null> {
        const dependency = await prisma.taskDependency.findUnique({
            where: { id },
        });

        if (!dependency) {
            return null;
        }

        return TaskDependency.createFromDb({
            id: dependency.id,
            predecessorTaskId: dependency.predecessorTaskId,
            successorTaskId: dependency.successorTaskId,
            wbsId: dependency.wbsId,
            createdAt: dependency.createdAt,
            updatedAt: dependency.updatedAt,
        });
    }

    async findByWbsId(wbsId: number): Promise<TaskDependency[]> {
        const dependencies = await prisma.taskDependency.findMany({
            where: { wbsId },
            orderBy: { id: 'asc' },
        });

        return dependencies.map(dep =>
            TaskDependency.createFromDb({
                id: dep.id,
                predecessorTaskId: dep.predecessorTaskId,
                successorTaskId: dep.successorTaskId,
                wbsId: dep.wbsId,
                createdAt: dep.createdAt,
                updatedAt: dep.updatedAt,
            })
        );
    }

    async findPredecessorsByTaskId(taskId: number): Promise<TaskDependency[]> {
        const dependencies = await prisma.taskDependency.findMany({
            where: { successorTaskId: taskId },
            orderBy: { id: 'asc' },
        });

        return dependencies.map(dep =>
            TaskDependency.createFromDb({
                id: dep.id,
                predecessorTaskId: dep.predecessorTaskId,
                successorTaskId: dep.successorTaskId,
                wbsId: dep.wbsId,
                createdAt: dep.createdAt,
                updatedAt: dep.updatedAt,
            })
        );
    }

    async findSuccessorsByTaskId(taskId: number): Promise<TaskDependency[]> {
        const dependencies = await prisma.taskDependency.findMany({
            where: { predecessorTaskId: taskId },
            orderBy: { id: 'asc' },
        });

        return dependencies.map(dep =>
            TaskDependency.createFromDb({
                id: dep.id,
                predecessorTaskId: dep.predecessorTaskId,
                successorTaskId: dep.successorTaskId,
                wbsId: dep.wbsId,
                createdAt: dep.createdAt,
                updatedAt: dep.updatedAt,
            })
        );
    }

    async delete(id: number): Promise<void> {
        await prisma.taskDependency.delete({
            where: { id },
        });
    }

    async deleteByTaskId(taskId: number): Promise<void> {
        await prisma.taskDependency.deleteMany({
            where: {
                OR: [
                    { predecessorTaskId: taskId },
                    { successorTaskId: taskId },
                ],
            },
        });
    }

    async exists(predecessorTaskId: number, successorTaskId: number): Promise<boolean> {
        const dependency = await prisma.taskDependency.findFirst({
            where: {
                predecessorTaskId,
                successorTaskId,
            },
        });

        return dependency !== null;
    }
}