import type { IPhaseRepository } from "@/applications/task/iphase-repository";
import type { WbsPhase as PhaseType } from "@/types/wbs";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

export interface IPhaseApplicationService {
    getAllPhaseTemplates(): Promise<PhaseType[] | null>;
    createPhaseTemplate(phase: { name: string, code: string, seq: number }): Promise<{ success: boolean, phase?: PhaseType }>;
}

/**
 * プロジェクトアプリケーションサービス
 */
@injectable()
export class PhaseApplicationService implements IPhaseApplicationService {
    constructor(@inject(SYMBOL.IPhaseRepository) private readonly phaseRepository: IPhaseRepository) {
    }

    /**
     * 工程テンプレートを取得
     * @param id 工程テンプレートID
     * @returns 工程テンプレート
     */
    public async getAllPhaseTemplates(): Promise<PhaseType[] | null> {
        const phases = await this.phaseRepository.findAllTemplates();

        if (!phases) return null;

        return phases.map((phase) => ({
            id: phase.id!,
            name: phase.name,
            seq: phase.seq,
            code: phase.code.value(),
        }));
    }

    /**
     * 工程テンプレートを作成
     * @param phase 工程テンプレート
     * @returns 工程テンプレート
     */
    public async createPhaseTemplate(phase: { name: string, code: string, seq: number }): Promise<{ success: boolean, phase?: PhaseType }> {

        // 同じ工程名、工程コードがないことをチェック
        const cheackPhase = await this.phaseRepository.findAllTemplates();
        if (cheackPhase.some(p => p.name === phase.name || p.code.value() === phase.code)) {
            return { success: false, phase: undefined };
        }

        // 工程テンプレートを作成
        const newPhase = Phase.create({
            name: phase.name,
            code: new PhaseCode(phase.code),
            seq: phase.seq,
        });
        const newPhaseDb = await this.phaseRepository.createTemplate(newPhase);

        return {
            success: true, phase: {
                id: newPhaseDb.id!,
                name: newPhaseDb.name,
                seq: newPhaseDb.seq,
                code: newPhaseDb.code.value(),
            }
        };
    }

}
