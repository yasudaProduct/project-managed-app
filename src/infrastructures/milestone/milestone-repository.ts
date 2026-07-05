import { IMilestoneRepository } from "@/applications/milestone/imilestone-repository";
import { Milestone } from "@/domains/milestone/milestone";
import { injectable } from "inversify";
import prisma from "@/lib/prisma/prisma";
import type { Milestone as MilestoneDbType } from "@prisma/client";

@injectable()
export class MilestoneRepository implements IMilestoneRepository {

    async findByWbsId(wbsId: number): Promise<Milestone[]> {
        const milestones = await prisma.milestone.findMany({
            where: {
                wbsId,
            },
        });
        return milestones.map(milestone => this.convertMilestone(milestone));
    }

    async create(wbsId: number, data: { name: string; date: Date }): Promise<Milestone> {
        const milestone = await prisma.milestone.create({
            data: {
                wbsId,
                name: data.name,
                date: data.date,
            },
        });
        return this.convertMilestone(milestone);
    }

    async update(id: number, data: { name: string; date: Date }): Promise<Milestone> {
        const milestone = await prisma.milestone.update({
            where: { id },
            data: {
                name: data.name,
                date: data.date,
            },
        });
        return this.convertMilestone(milestone);
    }

    async delete(id: number): Promise<void> {
        await prisma.milestone.delete({
            where: { id },
        });
    }

    private convertMilestone(milestone: MilestoneDbType): Milestone {
        return Milestone.createFromDb({
            id: milestone.id,
            name: milestone.name,
            date: milestone.date,
        });
    }
}