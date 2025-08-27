import { IMilestoneRepository } from "@/applications/milestone/milestone.interfase";
import { Milestone } from "@/domains/milestone/milestone";
import { injectable } from "inversify";
import prisma from "@/lib/prisma";
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

    private convertMilestone(milestone: MilestoneDbType): Milestone {
        return Milestone.create({
            id: milestone.id,
            name: milestone.name,
            date: milestone.date,
        });
    }
}