import { Milestone } from "@/domains/milestone/milestone";
import type { MilestoneTarget } from "@/types/milestone";

/** マイルストーンの書き込み内容。target / achievedAt を省略した場合は変更しない（作成時は既定値） */
export type MilestoneWriteData = {
    name: string;
    date: Date;
    target?: MilestoneTarget;
    achievedAt?: Date | null;
};

export interface IMilestoneRepository {
    findByWbsId(wbsId: number): Promise<Milestone[]>;
    create(wbsId: number, data: MilestoneWriteData): Promise<Milestone>;
    update(id: number, data: MilestoneWriteData): Promise<Milestone>;
    delete(id: number): Promise<void>;
}
