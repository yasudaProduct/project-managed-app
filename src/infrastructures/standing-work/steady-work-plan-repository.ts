import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import type { SteadyPlanUnit as PrismaSteadyPlanUnit, SteadyWorkPlan as SteadyWorkPlanDb } from "@prisma/client";
import type {
    ISteadyWorkPlanRepository,
    SteadyWorkPlanWithTask,
} from "@/applications/standing-work/isteady-work-plan-repository";
import { SteadyWorkPlan } from "@/domains/standing-work/steady-work-plan";
import type { SteadyPlanUnit } from "@/types/steady-work-plan";

@injectable()
export class SteadyWorkPlanRepository implements ISteadyWorkPlanRepository {
    async findById(id: number): Promise<SteadyWorkPlan | null> {
        const row = await prisma.steadyWorkPlan.findUnique({ where: { id } });
        return row ? toDomain(row) : null;
    }

    async findByTaskId(taskId: number): Promise<SteadyWorkPlan[]> {
        const rows = await prisma.steadyWorkPlan.findMany({
            where: { taskId },
            orderBy: { validFrom: "asc" },
        });
        return rows.map(toDomain);
    }

    async findByWbsId(wbsId: number): Promise<SteadyWorkPlan[]> {
        const rows = await prisma.steadyWorkPlan.findMany({
            where: { task: { wbsId, isDeleted: false } },
            orderBy: [{ taskId: "asc" }, { validFrom: "asc" }],
        });
        return rows.map(toDomain);
    }

    async findActiveByWbsIds(
        wbsIds: number[],
        range: { start: Date; end: Date }
    ): Promise<SteadyWorkPlanWithTask[]> {
        if (wbsIds.length === 0) return [];
        const rows = await prisma.steadyWorkPlan.findMany({
            where: {
                task: { wbsId: { in: wbsIds }, isDeleted: false },
                validFrom: { lte: range.end },
                OR: [{ validTo: null }, { validTo: { gte: range.start } }],
            },
            include: {
                task: { select: { id: true, name: true, wbsId: true, assigneeId: true } },
            },
            orderBy: [{ taskId: "asc" }, { validFrom: "asc" }],
        });
        return rows.map((row) => ({
            plan: toDomain(row),
            task: {
                id: row.task.id,
                name: row.task.name,
                wbsId: row.task.wbsId,
                assigneeId: row.task.assigneeId,
            },
        }));
    }

    async create(plan: SteadyWorkPlan): Promise<SteadyWorkPlan> {
        const row = await prisma.steadyWorkPlan.create({
            data: {
                taskId: plan.taskId,
                unit: toPrismaUnit(plan.unit),
                hours: plan.hours,
                validFrom: plan.validFrom,
                validTo: plan.validTo ?? null,
            },
        });
        return toDomain(row);
    }

    async update(plan: SteadyWorkPlan): Promise<SteadyWorkPlan> {
        if (plan.id === undefined) throw new Error("更新対象の定常枠にIDがありません");
        const row = await prisma.steadyWorkPlan.update({
            where: { id: plan.id },
            data: {
                unit: toPrismaUnit(plan.unit),
                hours: plan.hours,
                validFrom: plan.validFrom,
                validTo: plan.validTo ?? null,
            },
        });
        return toDomain(row);
    }

    async delete(id: number): Promise<void> {
        await prisma.steadyWorkPlan.delete({ where: { id } });
    }
}

function toDomain(row: SteadyWorkPlanDb): SteadyWorkPlan {
    return SteadyWorkPlan.createFromDb({
        id: row.id,
        taskId: row.taskId,
        unit: toUnit(row.unit),
        hours: Number(row.hours),
        validFrom: row.validFrom,
        validTo: row.validTo ?? undefined,
    });
}

function toUnit(unit: PrismaSteadyPlanUnit): SteadyPlanUnit {
    return unit === "PER_MONTH" ? "PER_MONTH" : "PER_DAY";
}

function toPrismaUnit(unit: SteadyPlanUnit): PrismaSteadyPlanUnit {
    return unit === "PER_MONTH" ? "PER_MONTH" : "PER_DAY";
}
