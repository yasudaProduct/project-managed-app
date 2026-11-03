import type { IMilestoneRepository, MilestoneWriteData } from "@/applications/milestone/imilestone-repository";
import { Milestone } from "@/domains/milestone/milestone";
import type { MilestoneTarget } from "@/types/milestone";
import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import type { Milestone as MilestoneDbType, MilestoneTargetType as MilestoneTargetTypeDb } from "@prisma/client";

type MilestoneDbRow = MilestoneDbType & { tasks?: { taskId: number }[] };

@injectable()
export class MilestoneRepository implements IMilestoneRepository {

    async findByWbsId(wbsId: number): Promise<Milestone[]> {
        const milestones = await prisma.milestone.findMany({
            where: {
                wbsId,
            },
            include: { tasks: { select: { taskId: true } } },
        });
        return milestones.map(milestone => this.convertMilestone(milestone));
    }

    async create(wbsId: number, data: MilestoneWriteData): Promise<Milestone> {
        const milestone = await prisma.milestone.create({
            data: {
                wbsId,
                name: data.name,
                date: data.date,
                ...(data.target && this.toTargetColumns(data.target, false)),
                ...(data.achievedAt !== undefined && { achievedAt: data.achievedAt }),
            },
        });
        return this.convertMilestone(milestone);
    }

    async update(id: number, data: MilestoneWriteData): Promise<Milestone> {
        const milestone = await prisma.milestone.update({
            where: { id },
            data: {
                name: data.name,
                date: data.date,
                ...(data.target && this.toTargetColumns(data.target, true)),
                ...(data.achievedAt !== undefined && { achievedAt: data.achievedAt }),
            },
        });
        return this.convertMilestone(milestone);
    }

    async delete(id: number): Promise<void> {
        await prisma.milestone.delete({
            where: { id },
        });
    }

    /** 対象の列と紐付けタスク。更新時は既存の紐付けを置き換える */
    private toTargetColumns(target: MilestoneTarget, replaceLinks: boolean) {
        const taskIds = target.targetType === 'TASKS' ? target.taskIds : [];
        const create = taskIds.map((taskId) => ({ taskId }));
        return {
            targetType: target.targetType as MilestoneTargetTypeDb,
            phaseId: target.targetType === 'PHASE' ? target.phaseId : null,
            tasks: replaceLinks ? { deleteMany: {}, create } : { create },
        };
    }

    private convertMilestone(milestone: MilestoneDbRow): Milestone {
        return Milestone.createFromDb({
            id: milestone.id,
            name: milestone.name,
            date: milestone.date,
            target: this.toTarget(milestone),
            achievedAt: milestone.achievedAt ?? null,
        });
    }

    private toTarget(milestone: MilestoneDbRow): MilestoneTarget {
        switch (milestone.targetType) {
            case 'PHASE':
                // 対象フェーズが削除された（SetNull）場合は phaseId=null のまま返し、「対象なし」と分かるようにする
                return { targetType: 'PHASE', phaseId: milestone.phaseId };
            case 'TASKS':
                return { targetType: 'TASKS', taskIds: (milestone.tasks ?? []).map((link) => link.taskId) };
            default:
                return { targetType: 'EVENT' };
        }
    }
}
