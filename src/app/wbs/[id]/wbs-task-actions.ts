"use server"

import { revalidatePath } from "next/cache"
import { KosuType, PeriodType, TaskStatus, WbsTask } from "@/types/wbs"
import prisma from "@/lib/prisma";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config"
import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { TaskStatus as TaskStatusDomain } from "@/domains/task/value-object/project-status";
import { ITaskFactory } from "@/domains/task/interfaces/task-factory";

const taskApplicationService = container.get<ITaskApplicationService>(SYMBOL.ITaskApplicationService);
const taskFactory = container.get<ITaskFactory>(SYMBOL.ITaskFactory);

export async function getTaskAll(wbsId: number): Promise<WbsTask[]> {

    const tasks = await taskApplicationService.getTaskAll(wbsId);
    return tasks.map(task => ({
        ...task,
        yoteiStart: task.yoteiStart ? new Date(task.yoteiStart.toISOString().split("T")[0]) : undefined,
        yoteiEnd: task.yoteiEnd ? new Date(task.yoteiEnd.toISOString().split("T")[0]) : undefined,
    }));

}

export async function createTask(
    wbsId: number,
    taskData: {
        name: string;
        periods?: {
            startDate?: string;
            endDate?: string;
            type: PeriodType;
            kosus: {
                kosu: number;
                type: KosuType;
            }[];
        }[];
        status: TaskStatus;
        assigneeId?: string;
        phaseId?: number;
    },
): Promise<{ success: boolean; task?: WbsTask; error?: string }> {
    try {
        // フェーズ情報を取得
        const phase = await prisma.wbsPhase.findUnique({
            where: { id: taskData.phaseId }
        });

        if (!phase) {
            return { success: false, error: "工程が見つかりません" };
        }

        // タスクIDを生成
        const taskId = await taskFactory.createTaskId(wbsId, phase.id);

        const result = await taskApplicationService.createTask({
            id: taskId.getValue(),
            name: taskData.name,
            wbsId: wbsId,
            assigneeId: taskData.assigneeId ? Number(taskData.assigneeId) : undefined,
            phaseId: taskData.phaseId!,
            status: new TaskStatusDomain({ status: taskData.status }),
            yoteiStartDate: new Date(taskData.periods![0].startDate!),
            yoteiEndDate: new Date(taskData.periods![0].endDate!),
            yoteiKosu: taskData.periods?.[0].kosus.find(k => k.type === 'NORMAL')?.kosu ?? 0,
        });

        if (result.success) {
            const task = await taskApplicationService.getTaskById(result.id!);
            return { success: true, task: task ?? undefined }
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "タスクの作成に失敗しました" };
    }
}

export async function updateTask(
    wbsId: number,
    taskData: {
        id: number;
        taskNo?: string;
        name: string;
        yoteiStart?: string;
        yoteiEnd?: string;
        yoteiKosu?: number;
        status: TaskStatus;
        assigneeId?: number;
        phaseId?: number;
    },
): Promise<{ success: boolean; task?: WbsTask, error?: string }> {
    console.log("updateTask");

    const result = await taskApplicationService.updateTask({
        wbsId: wbsId,
        updateTask: {
            ...taskData,
            yoteiStart: taskData.yoteiStart ? new Date(taskData.yoteiStart) : undefined,
            yoteiEnd: taskData.yoteiEnd ? new Date(taskData.yoteiEnd) : undefined,
        }
    });

    if (result.success) {
        const task = await taskApplicationService.getTaskById(taskData.id);
        revalidatePath(`/wbs/${wbsId}/gannt`);
        return { success: true, task: task ?? undefined }
    } else {
        return { success: false, error: result.error }
    }
}

export async function deleteTask(taskId: number): Promise<{ success: boolean, error?: string }> {

    const task = await prisma.wbsTask.findUnique({
        where: { id: taskId }
    })

    if (task) {
        await prisma.wbsTask.delete({
            where: { id: taskId }
        })
        revalidatePath(`/wbs/${task.wbsId}`)
        return { success: true }
    } else {
        return { success: false, error: "タスクが存在しません" }
    }
}

export async function getTaskStatusCount(wbsId: number) {

    const statusCount = {
        todo: 0,
        inProgress: 0,
        completed: 0,
    }

    statusCount.todo = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'NOT_STARTED' as TaskStatus,
        }
    })

    statusCount.inProgress = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'IN_PROGRESS',
        }
    })

    statusCount.completed = await prisma.wbsTask.count({
        where: {
            wbsId: wbsId,
            status: 'COMPLETED',
        }
    })

    return statusCount;
}

export async function getTaskProgressByPhase(wbsId: number) {
    const phases = await prisma.wbsPhase.findMany({
        where: { wbsId: wbsId },
        orderBy: { seq: 'asc' },
        include: {
            _count: {
                select: {
                    tasks: true,
                }
            }
        }
    });

    const progressData = await Promise.all(
        phases.map(async (phase) => {
            const taskStatusCount = await prisma.wbsTask.groupBy({
                by: ['status'],
                where: {
                    wbsId: wbsId,
                    phaseId: phase.id,
                },
                _count: {
                    id: true,
                },
            });

            const statusMap = taskStatusCount.reduce((acc, curr) => {
                acc[curr.status] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

            return {
                phase: phase.name,
                total: phase._count.tasks,
                todo: statusMap['TODO'] || 0,
                inProgress: statusMap['IN_PROGRESS'] || 0,
                completed: statusMap['COMPLETED'] || 0,
            };
        })
    );

    return progressData;
}

export async function getKosuSummary(wbsId: number) {
    const kosuData = await prisma.wbsTask.findMany({
        where: { wbsId: wbsId },
        include: {
            phase: true,
            assignee: true,
            periods: {
                include: {
                    kosus: true,
                }
            }
        }
    });

    const phaseSummary = kosuData.reduce((acc, task) => {
        const phaseName = task.phase?.name || '未分類';
        if (!acc[phaseName]) {
            acc[phaseName] = {
                kijun: 0,
                yotei: 0,
                jisseki: 0,
            };
        }

        task.periods.forEach(period => {
            period.kosus.forEach(kosu => {
                if (kosu.type === 'KIJUN' as KosuType) {
                    acc[phaseName].kijun += kosu.kosu;
                } else if (kosu.type === 'YOTEI' as KosuType) {
                    acc[phaseName].yotei += kosu.kosu;
                } else if (kosu.type === 'JISSEKI' as KosuType) {
                    acc[phaseName].jisseki += kosu.kosu;
                }
            });
        });

        return acc;
    }, {} as Record<string, { kijun: number; yotei: number; jisseki: number }>);

    return phaseSummary;
}

export async function getMilestones(wbsId: number) {
    const milestones = await prisma.milestone.findMany({
        where: { wbsId: wbsId },
        orderBy: { date: 'asc' },
    });

    return milestones;
}

// function formatTask(task: WbsTaskPrisma & { phase?: WbsPhasePrisma | null } & { assignee?: UserPrisma | null } & { periods?: (TaskPeriodPrisma & { kosus: TaskKosuPrisma[] })[] }): WbsTask {
// function formatTask(task: Task): WbsTask {
//     return {
//         id: task.id!.value(),
//         name: task.name,
//         status: task.status.getStatus(),
//         assigneeId: task.assigneeId ?? undefined,
//         assignee: task.assignee ? {
//             id: task.assignee.id!,
//             name: task.assignee.name,
//             displayName: task.assignee.displayName,
//         } : undefined,
//         phaseId: task.phaseId ?? undefined,
//         phase: task.phase ? {
//             id: task.phase.id!,
//             name: task.phase.name,
//             seq: task.phase.seq,
//         } : undefined,
//         createdAt: task.createdAt,
//         updatedAt: task.updatedAt,
//     }
// }