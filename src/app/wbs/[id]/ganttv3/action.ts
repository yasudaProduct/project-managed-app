"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { GanttPhase, Task as GanttTask, TaskStatus as GanntTaskStatus } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { Milestone, WbsTask } from "@/types/wbs";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IMilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { DependencyType } from "@/components/ganttv3/gantt";

// フェーズ色用の固定パレット（seq/index順に決定的に割り当てる）
const PHASE_COLOR_PALETTE = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6B7280",
];

// マイルストーンの固定色
const MILESTONE_COLOR = "#EF4444";

export async function getGanttTasks(wbsId: number): Promise<GanttTask[]> {

    const taskService = container.get<ITaskApplicationService>(
        SYMBOL.ITaskApplicationService
    );

    const milestoneService = container.get<IMilestoneApplicationService>(
        SYMBOL.IMilestoneApplicationService
    );

    const tasks = await taskService.getTaskAll(wbsId);
    const milestones = await milestoneService.getMilestones(wbsId);

    const ganttTasks: GanttTask[] = [
        ...milestones.map(convertMilestone).filter((milestone): milestone is GanttTask => milestone !== undefined),
        ...tasks.map(convertTask).filter((task): task is GanttTask => task !== undefined)
    ];

    // タスクバーの色をフェーズ色（getPhases と同じパレット・順序）に合わせる
    try {
        const wbsService = container.get<IWbsApplicationService>(
            SYMBOL.IWbsApplicationService
        );
        const phases = await wbsService.getPhases(wbsId);
        const phaseColorById = new Map<number, string>();
        phases.forEach((phase, index) => {
            phaseColorById.set(
                phase.id,
                PHASE_COLOR_PALETTE[index % PHASE_COLOR_PALETTE.length]
            );
        });

        for (const task of ganttTasks) {
            if (task.isMilestone || task.phaseId === undefined) continue;
            const color = phaseColorById.get(task.phaseId);
            if (color) {
                task.color = color;
            }
        }
    } catch (e) {
        console.error("フェーズ色の取得に失敗しました", e);
    }

    // 担当者の並び順（wbs_assignee.seq）を各タスクに付与する（グルーピング/ソート用）
    try {
        const wbsService = container.get<IWbsApplicationService>(
            SYMBOL.IWbsApplicationService
        );
        const assignees = await wbsService.getAssignees(wbsId);
        const seqByAssigneeId = new Map<number, number>();
        (assignees ?? []).forEach((a) => {
            if (a.assignee) {
                seqByAssigneeId.set(a.assignee.id, a.assignee.seq);
            }
        });

        for (const task of ganttTasks) {
            if (task.assigneeId === undefined) continue;
            const seq = seqByAssigneeId.get(task.assigneeId);
            if (seq !== undefined) {
                task.assigneeSeq = seq;
            }
        }
    } catch (e) {
        console.error("担当者の並び順の取得に失敗しました", e);
    }

    // 依存関係を読み込み、後続タスクの predecessors に詰める
    try {
        const dependencyService = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );
        const dependencies = await dependencyService.getDependenciesByWbsId(wbsId);
        const tasksById = new Map(ganttTasks.map((t) => [t.id, t]));

        for (const dep of dependencies) {
            const successor = tasksById.get(dep.successorTaskId.toString());
            if (successor) {
                successor.predecessors.push({
                    taskId: dep.predecessorTaskId.toString(),
                    type: dep.type as DependencyType,
                    lag: dep.lag,
                    dbId: dep.id,
                });
            }
        }
    } catch (e) {
        console.error("依存関係の取得に失敗しました", e);
    }

    return ganttTasks;
}

export async function getPhases(wbsId: number): Promise<GanttPhase[]> {

    const wbsService = container.get<IWbsApplicationService>(
        SYMBOL.IWbsApplicationService
    );

    const phases = await wbsService.getPhases(wbsId);
    return phases.map((phase, index) => ({
        id: phase.id.toString(),
        seq: phase.seq,
        name: phase.name,
        code: phase.code,
        color: PHASE_COLOR_PALETTE[index % PHASE_COLOR_PALETTE.length],
        startDate: phase.startDate,
        endDate: phase.endDate,
    }));
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
            // DB永続化用メタ情報
            dbId: task.id,
            assigneeId: task.assigneeId ?? task.assignee?.id,
            phaseId: task.phaseId ?? task.phase?.id,
            taskNo: task.taskNo,
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
        color: MILESTONE_COLOR,
        isMilestone: true,
        progress: 0,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        category: milestone.name,
        assignee: "milestone",
        // status: "notStarted",
        // DB永続化用メタ情報
        dbId: milestone.id,
    };
}