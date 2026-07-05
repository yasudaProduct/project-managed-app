"use server";

import { ITaskApplicationService } from "@/applications/task/task-application-service";
import { GanttPhase, Task as GanttTask, TaskStatus as GanntTaskStatus } from "@/components/ganttv3/gantt";
import { SYMBOL } from "@/types/symbol";
import { container } from "@/lib/inversify.config";
import { Milestone, WbsTask } from "@/types/wbs";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IMilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import type { ITaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { DependencyType } from "@/components/ganttv3/gantt";
import { statusColor } from "@/components/ganttv3/utils/taskFormat";
import { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { IProjectSettingsApplicationService } from "@/applications/project-settings/project-settings-application-service";

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

    // プロジェクトの進捗測定方式を取得（進捗率の算出に使用。未設定は自己申告）
    const progressMethod = await getProgressMeasurementMethod(wbsId);

    const ganttTasks: GanttTask[] = [
        ...milestones.map(convertMilestone).filter((milestone): milestone is GanttTask => milestone !== undefined),
        ...tasks.map((task) => convertTask(task, progressMethod, taskService)).filter((task): task is GanttTask => task !== undefined)
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
        const dependencyService = container.get<ITaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );
        const dependencies = await dependencyService.getDependenciesByWbsId(wbsId);
        const tasksById = new Map(ganttTasks.map((t) => [t.id, t]));

        for (const dep of dependencies) {
            // 依存はタスク間のみ。gantt Task.id は `task-<dbId>` 接頭辞を持つ
            const successor = tasksById.get(`task-${dep.successorTaskId}`);
            if (successor) {
                successor.predecessors.push({
                    taskId: `task-${dep.predecessorTaskId}`,
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

// 編集モードの担当者プルダウン用に、WBSの担当者一覧を seq 昇順で返す
// id は wbs_assignee.id（gantt Task の assigneeId と一致）
export async function getAssigneeOptions(
    wbsId: number
): Promise<{ id: number; name: string }[]> {
    const wbsService = container.get<IWbsApplicationService>(
        SYMBOL.IWbsApplicationService
    );

    const assignees = await wbsService.getAssignees(wbsId);
    return (assignees ?? [])
        .filter((a) => a.assignee !== null)
        .map((a) => ({
            id: a.assignee!.id,
            name: a.assignee!.displayName,
            seq: a.assignee!.seq,
        }))
        .sort((x, y) => x.seq - y.seq)
        .map(({ id, name }) => ({ id, name }));
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

// WBS（プロジェクト）の進捗測定方式を取得する。未設定時は自己申告進捗率。
async function getProgressMeasurementMethod(
    wbsId: number
): Promise<ProgressMeasurementMethod> {
    try {
        const wbsService = container.get<IWbsApplicationService>(
            SYMBOL.IWbsApplicationService
        );
        const wbs = await wbsService.getWbsById(wbsId);
        if (!wbs) return "SELF_REPORTED";

        const projectSettingsService = container.get<IProjectSettingsApplicationService>(
            SYMBOL.IProjectSettingsApplicationService
        );
        return await projectSettingsService.getProgressMeasurementMethod(wbs.projectId);
    } catch (e) {
        console.error("進捗測定方式の取得に失敗しました", e);
        return "SELF_REPORTED";
    }
}

function convertTask(
    task: WbsTask,
    progressMethod: ProgressMeasurementMethod,
    taskService: ITaskApplicationService
): GanttTask | undefined {

    let status: GanntTaskStatus | undefined;
    switch (task.status) {
        case "COMPLETED":
            status = "COMPLETED";
            break;
        case "IN_PROGRESS":
            status = "IN_PROGRESS";
            break;
        case "NOT_STARTED":
            status = "NOT_STARTED";
            break;
        case "ON_HOLD":
            status = "ON_HOLD";
            break;
    }
    // フェーズ未割当タスク（phaseId===undefined でフェーズ色上書きの対象外）でも
    // 有効な hex 色になるよう、ステータス色（hex）を使う。名前色だと TaskBar の
    // `${color}20` が "gray20" のような不正値になり黒バーで描画されてしまう。
    const color = statusColor(status);

    if (task.yoteiStart && task.yoteiEnd) {

        // プロジェクトの進捗測定方式に基づく実効進捗率（0-100）
        const progress = taskService.calculateEffectiveProgress(
            task.status,
            task.progressRate ?? null,
            progressMethod
        );

        // 実績バー用の期間。実績開始のみ（進行中で終了未入力）の場合は本日までとする
        const actualStartDate: Date | undefined = task.jissekiStart;
        let actualEndDate: Date | undefined = task.jissekiEnd;
        if (actualStartDate && !actualEndDate) {
            actualEndDate = new Date();
        }

        return {
            id: `task-${task.id}`,
            name: task.name,
            startDate: task.yoteiStart,
            endDate: task.yoteiEnd,
            duration: task.yoteiKosu ?? 0,
            actualStartDate,
            actualEndDate,
            color: color,
            isMilestone: false,
            progress,
            predecessors: [],
            level: 0,
            isManuallyScheduled: true,
            category: task.phase?.name,
            assignee: task.assignee?.displayName ?? task.assignee?.name,
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
        id: `ms-${milestone.id}`,
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