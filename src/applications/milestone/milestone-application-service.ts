import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IMilestoneRepository } from "./milestone.interfase";

export interface IMilestoneApplicationService {
    getMilestones(wbsId: number): Promise<{ id: number; name: string; date: Date; }[]>;
}

@injectable()
export class MilestoneApplicationService implements IMilestoneApplicationService {

    constructor(
        @inject(SYMBOL.IMilestoneRepository) private readonly milestoneRepository: IMilestoneRepository,
    ) { }

    public async getMilestones(wbsId: number): Promise<{ id: number; name: string; date: Date; }[]> {
        const milestones = await this.milestoneRepository.findByWbsId(wbsId);

        return milestones.map(milestone => ({
            id: milestone.id,
            name: milestone.name,
            date: milestone.date,
        }));
    }
}
