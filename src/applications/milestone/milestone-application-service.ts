import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IMilestoneRepository } from "./imilestone-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import type { IEvmService } from "@/applications/evm/evm-service";
import type {
    MilestoneTarget,
    MilestoneTargetType,
    MilestoneForecastStatus,
} from "@/types/milestone";
import { calendarDateInTimeZone } from "@/utils/date-util";
import { evaluateMilestone, type MilestoneTargetTask } from "@/domains/milestone/milestone-forecast";
import type { Milestone } from "@/domains/milestone/milestone";
import type { Task } from "@/domains/task/task";

/** マイルストーンと達成見込み（Server Action 経由でクライアントへ渡すため日付は ISO 文字列） */
export type MilestoneForecastDto = {
    id: number;
    name: string;
    date: string;
    targetType: MilestoneTargetType;
    /** フェーズ完了型の対象フェーズ（対象フェーズが削除された場合は null） */
    phaseId: number | null;
    /** タスク指定型の対象タスク（紐付けが切れたタスクを含む） */
    taskIds: number[];
    achievedAt: string | null;
    status: MilestoneForecastStatus;
    forecastDate: string | null;
    delayDays: number | null;
    completedCount: number;
    totalCount: number;
    brokenLinkCount: number;
};

type MilestoneWriteArgs = {
    name: string;
    date: Date;
    target?: MilestoneTarget;
    achievedAt?: Date | null;
};

export interface IMilestoneApplicationService {
    getMilestones(wbsId: number): Promise<{ id: number; name: string; date: Date; }[]>;
    /** マイルストーンごとの達成見込み（予定日の早い順） */
    listMilestoneForecasts(wbsId: number, now?: Date): Promise<MilestoneForecastDto[]>;
    createMilestone(args: { wbsId: number } & MilestoneWriteArgs): Promise<{ success: boolean; error?: string; id?: number }>;
    updateMilestone(args: { id: number } & MilestoneWriteArgs): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteMilestone(id: number): Promise<{ success: boolean; error?: string }>;
}

@injectable()
export class MilestoneApplicationService implements IMilestoneApplicationService {

    constructor(
        @inject(SYMBOL.IMilestoneRepository) private readonly milestoneRepository: IMilestoneRepository,
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.IEvmService) private readonly evmService: IEvmService,
    ) { }

    public async getMilestones(wbsId: number): Promise<{ id: number; name: string; date: Date; }[]> {
        const milestones = await this.milestoneRepository.findByWbsId(wbsId);

        return milestones.map(milestone => ({
            id: milestone.id,
            name: milestone.name,
            date: milestone.date,
        }));
    }

    public async listMilestoneForecasts(wbsId: number, now: Date = new Date()): Promise<MilestoneForecastDto[]> {
        const today = calendarDateInTimeZone(now);
        const [milestones, tasks] = await Promise.all([
            this.milestoneRepository.findByWbsId(wbsId),
            this.taskRepository.findActiveByWbsId(wbsId),
        ]);
        // フェーズ完了型があるときだけ EVM（Earned Schedule）でフェーズの予測完了日を求める
        const phaseForecasts = milestones.some((milestone) => milestone.target.targetType === 'PHASE')
            ? await this.evmService.getPhaseForecastDates(wbsId, now)
            : new Map<number, Date | null>();

        return milestones
            .map((milestone) => this.toForecastDto(milestone, tasks, phaseForecasts, today))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    public async createMilestone(args: { wbsId: number } & MilestoneWriteArgs): Promise<{ success: boolean; error?: string; id?: number }> {
        const invalid = this.validateTarget(args.target);
        if (invalid) return { success: false, error: invalid };
        try {
            const created = await this.milestoneRepository.create(args.wbsId, {
                name: args.name,
                date: args.date,
                target: args.target,
                achievedAt: args.achievedAt,
            });
            return { success: true, id: created.id };
        } catch {
            return { success: false, error: "マイルストーンの作成に失敗しました。" };
        }
    }

    public async updateMilestone(args: { id: number } & MilestoneWriteArgs): Promise<{ success: boolean; error?: string; id?: number }> {
        const invalid = this.validateTarget(args.target);
        if (invalid) return { success: false, error: invalid };
        try {
            const updated = await this.milestoneRepository.update(args.id, {
                name: args.name,
                date: args.date,
                target: args.target,
                achievedAt: args.achievedAt,
            });
            return { success: true, id: updated.id };
        } catch {
            return { success: false, error: "マイルストーンの更新に失敗しました。" };
        }
    }

    public async deleteMilestone(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            await this.milestoneRepository.delete(id);
            return { success: true };
        } catch {
            return { success: false, error: "マイルストーンの削除に失敗しました。" };
        }
    }

    private validateTarget(target?: MilestoneTarget): string | null {
        if (target?.targetType === 'PHASE' && target.phaseId === null) {
            return "対象フェーズを選択してください。";
        }
        if (target?.targetType === 'TASKS' && target.taskIds.length === 0) {
            return "対象タスクを1件以上選択してください。";
        }
        return null;
    }

    private toForecastDto(
        milestone: Milestone,
        tasks: Task[],
        phaseForecasts: Map<number, Date | null>,
        today: Date
    ): MilestoneForecastDto {
        const target = milestone.target;
        const toTargetTask = (task: Task): MilestoneTargetTask => ({
            status: task.getStatus(),
            plannedEnd: task.getYoteiEnd() ?? null,
        });

        let targetTasks: MilestoneTargetTask[] = [];
        let brokenLinkCount = 0;
        let phaseForecastDate: Date | null = null;
        if (target.targetType === 'PHASE' && target.phaseId !== null) {
            targetTasks = tasks.filter((task) => task.phaseId === target.phaseId).map(toTargetTask);
            phaseForecastDate = phaseForecasts.get(target.phaseId) ?? null;
        } else if (target.targetType === 'TASKS') {
            const taskById = new Map(tasks.map((task) => [task.id, task]));
            for (const taskId of target.taskIds) {
                const task = taskById.get(taskId);
                if (task) targetTasks.push(toTargetTask(task));
                else brokenLinkCount++;
            }
        }

        const forecast = evaluateMilestone(
            {
                targetType: target.targetType,
                dueDate: milestone.date,
                achievedAt: milestone.achievedAt,
                targetTasks,
                brokenLinkCount,
                phaseForecastDate,
            },
            today
        );

        return {
            id: milestone.id,
            name: milestone.name,
            date: milestone.date.toISOString(),
            targetType: target.targetType,
            phaseId: target.targetType === 'PHASE' ? target.phaseId : null,
            taskIds: target.targetType === 'TASKS' ? target.taskIds : [],
            achievedAt: milestone.achievedAt?.toISOString() ?? null,
            status: forecast.status,
            forecastDate: forecast.forecastDate?.toISOString() ?? null,
            delayDays: forecast.delayDays,
            completedCount: forecast.completedCount,
            totalCount: forecast.totalCount,
            brokenLinkCount: forecast.brokenLinkCount,
        };
    }
}
