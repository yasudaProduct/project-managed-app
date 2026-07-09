"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { GanttPhase, Task as GanttTask, TaskStatus as GanntTaskStatus } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { Milestone, WbsTask, TaskStatus as WbsTaskStatus } from "@/types/wbs";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IMilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { ForecastCalculationService } from "@/domains/forecast/forecast-calculation.service";
import { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { IPhaseApplicationService } from "@/applications/phase/phase-application-service";
import { TaskStatus as TaskStatusDomain } from "@/domains/task/value-object/project-status";
import prisma from "@/lib/prisma/prisma";

/**
 * タスクごとの実績・見通し工数などの付加情報
 */
interface TaskEnrichment {
    yoteiKosu?: number;
    jissekiKosu?: number;
    forecastKosu?: number;
    jissekiStart?: Date;
    jissekiEnd?: Date;
    progressRate?: number;
}

export async function getGanttTasks(wbsId: number): Promise<GanttTask[]> {

    const taskService = container.get<ITaskApplicationService>(
        SYMBOL.ITaskApplicationService
    );

    const milestoneService = container.get<IMilestoneApplicationService>(
        SYMBOL.IMilestoneApplicationService
    );

    const tasks = await taskService.getTaskAll(wbsId);
    const milestones = await milestoneService.getMilestones(wbsId);

    // 実績工数・見通し工数などの付加情報を算出する
    const enrichmentMap = await buildEnrichmentMap(wbsId);

    const ganttTasks = tasks
        .map(convertTask)
        .filter((task): task is GanttTask => task !== undefined)
        .map((task) => {
            const enrichment = enrichmentMap.get(task.id);
            return enrichment ? { ...task, ...enrichment } : task;
        });

    return [
        ...milestones.map(convertMilestone).filter((milestone): milestone is GanttTask => milestone !== undefined),
        ...ganttTasks,
    ];
}

/**
 * WBSタスクデータから、実績・見通し工数などの付加情報マップを作成する
 * （見通し工数計算と同じデータソース（work_records集計）を使用し整合性を担保する）
 */
async function buildEnrichmentMap(wbsId: number): Promise<Map<string, TaskEnrichment>> {
    const map = new Map<string, TaskEnrichment>();

    try {
        const wbsQueryRepository = container.get<IWbsQueryRepository>(
            SYMBOL.IWbsQueryRepository
        );
        const wbsTasks = await wbsQueryRepository.getWbsTasks(wbsId);

        for (const t of wbsTasks) {
            const forecast = ForecastCalculationService.calculateTaskForecast(t, {
                method: "realistic",
                progressMeasurementMethod: "SELF_REPORTED",
            });

            map.set(String(t.id), {
                yoteiKosu: t.yoteiKosu ?? undefined,
                jissekiKosu: t.jissekiKosu ?? undefined,
                forecastKosu: forecast.forecastHours,
                jissekiStart: t.jissekiStart ?? undefined,
                jissekiEnd: t.jissekiEnd ?? undefined,
                progressRate: t.progressRate ?? undefined,
            });
        }
    } catch (error) {
        // 付加情報の取得に失敗してもガント表示自体は継続する
        console.error("タスク付加情報の取得に失敗しました:", error);
    }

    return map;
}

export async function getPhases(wbsId: number): Promise<GanttPhase[]> {

    const wbsService = container.get<IWbsApplicationService>(
        SYMBOL.IWbsApplicationService
    );

    const phases = await wbsService.getPhases(wbsId);
    return phases.map(phase => ({
        id: phase.id.toString(),
        seq: phase.seq,
        name: phase.name,
        code: phase.code,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        startDate: phase.startDate,
        endDate: phase.endDate,
    }));
}

/**
 * タスクモーダルの担当者選択用に、WBSの担当者一覧を取得する
 */
export async function getGanttAssignees(
    wbsId: number
): Promise<{ id: number; name: string }[]> {
    const wbsService = container.get<IWbsApplicationService>(
        SYMBOL.IWbsApplicationService
    );

    const assignees = await wbsService.getAssignees(wbsId);
    if (!assignees) return [];

    return assignees
        .filter((a) => a.assignee !== null)
        .map((a) => ({
            id: a.assignee!.id,
            name: a.assignee!.displayName || a.assignee!.name,
        }));
}

/**
 * ガントチャートからタスクを新規作成する
 */
export async function createGanttTask(
    wbsId: number,
    taskData: {
        name: string;
        phaseId: number;
        assigneeId?: number;
        yoteiStartDate: string;
        yoteiEndDate: string;
        yoteiKosu: number;
        status: WbsTaskStatus;
    }
): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
        const taskService = container.get<ITaskApplicationService>(
            SYMBOL.ITaskApplicationService
        );
        const taskFactory = container.get<ITaskFactory>(SYMBOL.ITaskFactory);
        const phaseService = container.get<IPhaseApplicationService>(
            SYMBOL.IPhaseApplicationService
        );

        const phase = await phaseService.getPhaseById(taskData.phaseId);
        if (!phase) {
            return { success: false, error: "工程が見つかりません" };
        }

        const taskId = await taskFactory.createTaskId(wbsId, phase.id);

        const result = await taskService.createTask({
            id: taskId.getValue(),
            name: taskData.name,
            wbsId,
            phaseId: taskData.phaseId,
            assigneeId: taskData.assigneeId,
            status: new TaskStatusDomain({ status: taskData.status }),
            yoteiStartDate: new Date(taskData.yoteiStartDate),
            yoteiEndDate: new Date(taskData.yoteiEndDate),
            yoteiKosu: taskData.yoteiKosu,
        });

        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "タスクの作成に失敗しました",
        };
    }
}

/**
 * ガントチャートからタスクを削除する
 *
 * 注意: タスクに紐づく実績（作業実績 = work_records）データは削除しない。
 *       タスクとの関連のみ解除（taskId を null に）し、実績データ自体は保持する。
 */
export async function deleteGanttTask(
    taskId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            // 紐づく実績データは削除せず、タスクとの関連のみ解除する
            await tx.workRecord.updateMany({
                where: { taskId },
                data: { taskId: null },
            });

            // ステータスログはタスクに付随するログのため削除する
            await tx.taskStatusLog.deleteMany({ where: { taskId } });

            // タスク本体を削除（予定期間・工数・依存関係はカスケード削除される）
            await tx.wbsTask.delete({ where: { id: taskId } });
        });

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "タスクの削除に失敗しました",
        };
    }
}

function convertTask(task: WbsTask): GanttTask | undefined {

    let color = "red";
    let status: GanntTaskStatus
    switch (task.status) {
        case "COMPLETED":
            color = "green";
            status = "COMPLETED";
            break;
        case "IN_PROGRESS":
            color = "blue";
            status = "IN_PROGRESS";
            break;
        case "NOT_STARTED":
            color = "gray";
            status = "NOT_STARTED";
            break;
        case "ON_HOLD":
            color = "yellow";
            status = "ON_HOLD";
            break;
    }

    if (task.yoteiStart && task.yoteiEnd && task.yoteiKosu) {

        return {
            id: task.id.toString(),
            name: task.name,
            startDate: task.yoteiStart,
            endDate: task.yoteiEnd,
            duration: task.yoteiKosu,
            color: color,
            isMilestone: false,
            progress: 0,
            predecessors: [],
            level: 0,
            isManuallyScheduled: true,
            category: task.phase?.name,
            assignee: task.assignee?.name,
            status: status,
            yoteiKosu: task.yoteiKosu,
            jissekiKosu: task.jissekiKosu,
            jissekiStart: task.jissekiStart,
            jissekiEnd: task.jissekiEnd,
            phaseId: task.phaseId,
            assigneeId: task.assigneeId,
        };
    }

    return undefined;
}

function convertMilestone(milestone: Milestone): GanttTask | undefined {

    return {
        id: milestone.id.toString(),
        name: milestone.name,
        startDate: milestone.date,
        endDate: milestone.date,
        duration: 0,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        isMilestone: true,
        progress: 0,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        category: milestone.name,
        assignee: "milestone",
        // status: "notStarted",
    };
}
