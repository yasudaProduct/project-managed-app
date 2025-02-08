import { ITaskRepository } from "@/applications/task/itask-repository";
import { Phase } from "@/domains/phase/phase";
import { Assignee } from "@/domains/task/assignee";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/man-hour-type";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/period-type";
import { TaskStatus } from "@/domains/task/project-status";
import { Task } from "@/domains/task/task";
import prisma from "@/lib/prisma";
import { injectable } from "inversify";

@injectable()
export class TaskRepository implements ITaskRepository {

    async findById(id: string): Promise<Task | null> {
        const taskDb = await prisma.wbsTask.findUnique({
            where: { id },
            include: {
                assignee: true,
                phase: true,
                periods: {
                    include: {
                        kosus: true,
                    },
                },
            }
        });

        if (!taskDb) return null;
        return Task.createFromDb({
            id: taskDb.id,
            wbsId: taskDb.wbsId,
            name: taskDb.name,
            status: new TaskStatus({ status: taskDb.status }),
            assigneeId: taskDb.assigneeId ?? undefined,
            assignee: taskDb.assignee ? Assignee.createFromDb({
                id: taskDb.assignee.id,
                name: taskDb.assignee.name,
                displayName: taskDb.assignee.displayName,
            }) : undefined,
            phaseId: taskDb.phaseId ?? undefined,
            phase: taskDb.phase ? Phase.createFromDb({
                id: taskDb.phase.id,
                name: taskDb.phase.name,
                seq: taskDb.phase.seq,
            }) : undefined,
            periods: taskDb.periods.map(period => Period.createFromDb({
                id: period.id,
                startDate: period.startDate,
                endDate: period.endDate,
                type: new PeriodType({ type: period.type }),
                manHours: period.kosus.map(kosu => ManHour.createFromDb({
                    id: kosu.id,
                    kosu: kosu.kosu,
                    type: new ManHourType({ type: kosu.type }),
                })),
            })),
        });
    }

    async findAll(wbsId: number): Promise<Task[]> {
        const tasksDb = await prisma.wbsTask.findMany({
            where: {
                wbsId: wbsId
            },
            include: {
                assignee: true,
                phase: true,
                periods: {
                    include: {
                        kosus: true,
                    },
                },
            }
        });
        return tasksDb.map(taskDb => Task.createFromDb({
            id: taskDb.id,
            name: taskDb.name,
            wbsId: taskDb.wbsId,
            assigneeId: taskDb.assigneeId ?? undefined,
            assignee: taskDb.assignee ? Assignee.createFromDb({
                id: taskDb.assignee.id,
                name: taskDb.assignee.name,
                displayName: taskDb.assignee.displayName,
            }) : undefined,
            phaseId: taskDb.phaseId ?? undefined,
            phase: taskDb.phase ? Phase.createFromDb({
                id: taskDb.phase.id,
                name: taskDb.phase.name,
                seq: taskDb.phase.seq,
            }) : undefined,
            periods: taskDb.periods.map(period => Period.createFromDb({
                id: period.id,
                startDate: period.startDate,
                endDate: period.endDate,
                type: new PeriodType({ type: period.type }),
                manHours: period.kosus.map(kosu => ManHour.createFromDb({
                    id: kosu.id,
                    kosu: kosu.kosu,
                    type: new ManHourType({ type: kosu.type }),
                })),
            })),
            status: new TaskStatus({ status: taskDb.status }),
            createdAt: taskDb.createdAt,
            updatedAt: taskDb.updatedAt,
        }));
    }

    async create(task: Task): Promise<Task> {
        const taskDb = await prisma.wbsTask.create({
            data: {
                name: task.name,
                wbsId: task.wbsId,
                assigneeId: task.assigneeId ?? undefined,
                status: task.status.status,
            },
        });
        return Task.createFromDb({
            id: taskDb.id,
            name: taskDb.name,
            wbsId: taskDb.wbsId,
            assigneeId: taskDb.assigneeId ?? undefined,
            status: new TaskStatus({ status: taskDb.status }),
        });
    }

    async update(task: Task): Promise<Task> {
        const taskDb = await prisma.wbsTask.update({
            where: { id: task.id },
            data: {
                name: task.name,
                assigneeId: task.assigneeId ?? undefined,
                status: task.status.status,
            },
        });
        return Task.createFromDb({
            id: taskDb.id,
            name: taskDb.name,
            wbsId: taskDb.wbsId,
            assigneeId: taskDb.assigneeId ?? undefined,
            status: new TaskStatus({ status: taskDb.status }),
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.wbsTask.delete({
            where: { id },
        });
    }
}   