import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { SteadyPlanUnit, SteadyWorkPlanDto, SteadyWorkTaskDto } from "@/types/steady-work-plan";
import type { ISteadyWorkPlanRepository } from "./isteady-work-plan-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import type { IPhaseRepository } from "@/applications/task/iphase-repository";
import type { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import type { ITaskFactory } from "@/domains/task/interfaces/task-factory";
import { SteadyWorkPlan } from "@/domains/standing-work/steady-work-plan";
import { Task } from "@/domains/task/task";
import { TaskStatus } from "@/domains/task/value-object/task-status";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

/** 常設プロジェクトの既定の工程（工程が無い WBS に定常タスクを追加するときに作る） */
export const DEFAULT_STANDING_PHASE = { name: "定常", code: "STD", seq: 1 } as const;

export type CreateSteadyWorkTaskInput = {
    wbsId: number;
    name: string;
    /** WBS担当者（WbsAssignee）のID */
    assigneeId?: number;
};

export type SteadyWorkPlanInput = {
    unit: SteadyPlanUnit;
    hours: number;
    validFrom: Date;
    validTo?: Date;
};

export type StandingWorkResult = { success: boolean; id?: number; error?: string };

export interface IStandingWorkApplicationService {
    /** 常設 WBS のタスク一覧（担当者・定常枠付き） */
    listSteadyWorkTasks(wbsId: number): Promise<SteadyWorkTaskDto[]>;
    /** 常設 WBS に期間なしの定常タスクを追加する（工程が無ければ既定の工程を作る） */
    createSteadyWorkTask(input: CreateSteadyWorkTaskInput): Promise<StandingWorkResult>;
    createSteadyWorkPlan(input: SteadyWorkPlanInput & { taskId: number }): Promise<StandingWorkResult>;
    updateSteadyWorkPlan(input: SteadyWorkPlanInput & { id: number }): Promise<StandingWorkResult>;
    deleteSteadyWorkPlan(id: number): Promise<StandingWorkResult>;
}

/**
 * 常設プロジェクト（定常・不定期作業の受け皿）の定常タスク・定常枠を扱う。
 * docs/plans/non-project-work-management.md §11.3
 */
@injectable()
export class StandingWorkApplicationService implements IStandingWorkApplicationService {
    constructor(
        @inject(SYMBOL.ISteadyWorkPlanRepository) private readonly steadyWorkPlanRepository: ISteadyWorkPlanRepository,
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.IPhaseRepository) private readonly phaseRepository: IPhaseRepository,
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
        @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
        @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
        @inject(SYMBOL.ITaskFactory) private readonly taskFactory: ITaskFactory
    ) {}

    public async listSteadyWorkTasks(wbsId: number): Promise<SteadyWorkTaskDto[]> {
        const [tasks, plans] = await Promise.all([
            this.taskRepository.findActiveByWbsId(wbsId),
            this.steadyWorkPlanRepository.findByWbsId(wbsId),
        ]);
        const plansByTaskId = new Map<number, SteadyWorkPlanDto[]>();
        for (const plan of plans) {
            const list = plansByTaskId.get(plan.taskId) ?? [];
            list.push(toPlanDto(plan));
            plansByTaskId.set(plan.taskId, list);
        }
        return tasks
            .filter((task) => task.id !== undefined)
            .map((task) => ({
                taskId: task.id!,
                taskNo: task.taskNo.getValue(),
                name: task.name,
                assignee:
                    task.assignee && task.assigneeId !== undefined
                        ? {
                              id: task.assigneeId,
                              userId: task.assignee.userId ?? "",
                              displayName: task.assignee.displayName,
                          }
                        : null,
                plans: plansByTaskId.get(task.id!) ?? [],
            }));
    }

    public async createSteadyWorkTask(input: CreateSteadyWorkTaskInput): Promise<StandingWorkResult> {
        const wbs = await this.wbsRepository.findById(input.wbsId);
        if (!wbs) return { success: false, error: "WBSが見つかりません" };
        if (!(await this.isStandingProject(wbs.projectId))) {
            return { success: false, error: "常設プロジェクトのWBSにのみ定常タスクを追加できます" };
        }
        if (input.assigneeId !== undefined) {
            const assignee = await this.wbsAssigneeRepository.findById(input.assigneeId);
            if (!assignee || assignee.wbsId !== input.wbsId) {
                return { success: false, error: "担当者がWBSに存在しません" };
            }
        }

        try {
            const phaseId = await this.resolvePhaseId(input.wbsId);
            const task = Task.create({
                taskNo: await this.taskFactory.createTaskId(input.wbsId, phaseId),
                wbsId: input.wbsId,
                name: input.name,
                phaseId,
                assigneeId: input.assigneeId,
                status: new TaskStatus({ status: "NOT_STARTED" }),
            });
            const created = await this.taskRepository.create(task);
            return { success: true, id: created.id };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "定常タスクの作成に失敗しました" };
        }
    }

    public async createSteadyWorkPlan(input: SteadyWorkPlanInput & { taskId: number }): Promise<StandingWorkResult> {
        const task = await this.taskRepository.findById(input.taskId);
        if (!task) return { success: false, error: "タスクが見つかりません" };
        const wbs = await this.wbsRepository.findById(task.wbsId);
        if (!wbs || !(await this.isStandingProject(wbs.projectId))) {
            return { success: false, error: "定常枠は常設プロジェクトのタスクにのみ設定できます" };
        }
        if (task.assigneeId === undefined || task.assigneeId === null) {
            return { success: false, error: "担当者が設定されていないタスクには定常枠を設定できません" };
        }

        try {
            const plan = SteadyWorkPlan.create({
                taskId: input.taskId,
                unit: input.unit,
                hours: input.hours,
                validFrom: input.validFrom,
                validTo: input.validTo,
            });
            const existing = await this.steadyWorkPlanRepository.findByTaskId(input.taskId);
            SteadyWorkPlan.assertNoOverlap([...existing, plan]);
            const created = await this.steadyWorkPlanRepository.create(plan);
            return { success: true, id: created.id };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "定常枠の作成に失敗しました" };
        }
    }

    public async updateSteadyWorkPlan(input: SteadyWorkPlanInput & { id: number }): Promise<StandingWorkResult> {
        const current = await this.steadyWorkPlanRepository.findById(input.id);
        if (!current) return { success: false, error: "定常枠が見つかりません" };

        try {
            const updated = SteadyWorkPlan.createFromDb({
                id: input.id,
                taskId: current.taskId,
                unit: input.unit,
                hours: input.hours,
                validFrom: input.validFrom,
                validTo: input.validTo,
            });
            const others = (await this.steadyWorkPlanRepository.findByTaskId(current.taskId)).filter(
                (plan) => plan.id !== input.id
            );
            SteadyWorkPlan.assertNoOverlap([...others, updated]);
            await this.steadyWorkPlanRepository.update(updated);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "定常枠の更新に失敗しました" };
        }
    }

    public async deleteSteadyWorkPlan(id: number): Promise<StandingWorkResult> {
        const current = await this.steadyWorkPlanRepository.findById(id);
        if (!current) return { success: false, error: "定常枠が見つかりません" };
        await this.steadyWorkPlanRepository.delete(id);
        return { success: true };
    }

    private async isStandingProject(projectId: string): Promise<boolean> {
        const project = await this.projectRepository.findById(projectId);
        return project?.isStanding() ?? false;
    }

    /** WBS の先頭の工程を使う。無ければ既定の工程「定常」を作る */
    private async resolvePhaseId(wbsId: number): Promise<number> {
        const phases = await this.phaseRepository.findByWbsId(wbsId);
        const first = phases.find((phase) => phase.id !== undefined);
        if (first?.id !== undefined) return first.id;

        const created = await this.phaseRepository.create(
            wbsId,
            Phase.create({
                name: DEFAULT_STANDING_PHASE.name,
                code: new PhaseCode(DEFAULT_STANDING_PHASE.code),
                seq: DEFAULT_STANDING_PHASE.seq,
            })
        );
        if (created.id === undefined) throw new Error("工程の作成に失敗しました");
        return created.id;
    }
}

function toPlanDto(plan: SteadyWorkPlan): SteadyWorkPlanDto {
    return {
        id: plan.id!,
        taskId: plan.taskId,
        unit: plan.unit,
        hours: plan.hours,
        validFrom: plan.validFrom.toISOString(),
        validTo: plan.validTo ? plan.validTo.toISOString() : null,
    };
}
