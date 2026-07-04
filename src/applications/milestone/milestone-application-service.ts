import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IMilestoneRepository } from "./milestone.interfase";

export interface IMilestoneApplicationService {
    getMilestones(wbsId: number): Promise<{ id: number; name: string; date: Date; }[]>;
    createMilestone(args: { wbsId: number; name: string; date: Date }): Promise<{ success: boolean; error?: string; id?: number }>;
    updateMilestone(args: { id: number; name: string; date: Date }): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteMilestone(id: number): Promise<{ success: boolean; error?: string }>;
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

    public async createMilestone(args: { wbsId: number; name: string; date: Date }): Promise<{ success: boolean; error?: string; id?: number }> {
        try {
            const created = await this.milestoneRepository.create(args.wbsId, {
                name: args.name,
                date: args.date,
            });
            return { success: true, id: created.id };
        } catch {
            return { success: false, error: "マイルストーンの作成に失敗しました。" };
        }
    }

    public async updateMilestone(args: { id: number; name: string; date: Date }): Promise<{ success: boolean; error?: string; id?: number }> {
        try {
            const updated = await this.milestoneRepository.update(args.id, {
                name: args.name,
                date: args.date,
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
}
