import { Milestone } from "@/domains/milestone/milestone";

export interface IMilestoneRepository {
    findByWbsId(wbsId: number): Promise<Milestone[]>;
    create(wbsId: number, data: { name: string; date: Date }): Promise<Milestone>;
    update(id: number, data: { name: string; date: Date }): Promise<Milestone>;
    delete(id: number): Promise<void>;
}
