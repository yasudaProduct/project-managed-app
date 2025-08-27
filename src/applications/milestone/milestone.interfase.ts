import { Milestone } from "@/domains/milestone/milestone";

export interface IMilestoneRepository {
    findByWbsId(wbsId: number): Promise<Milestone[]>;
}
