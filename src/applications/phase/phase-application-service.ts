import type { IPhaseRepository } from "@/applications/task/iphase-repository";
import type { WbsPhase as PhaseType } from "@/types/wbs";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

export type WbsPhaseType = PhaseType & { wbsId: number };

export interface IPhaseApplicationService {
    getAllPhaseTemplates(): Promise<PhaseType[] | null>;
    createPhaseTemplate(phase: { name: string, code: string, seq: number }): Promise<{ success: boolean, phase?: PhaseType }>;
    updatePhaseTemplate(phase: { id: number, name: string, code: string, seq: number }): Promise<{ success: boolean, phase?: PhaseType }>;
    getPhaseTemplateById(id: number): Promise<PhaseType | null>;
    deletePhaseTemplate(id: number): Promise<{ success: boolean; error?: string }>;
    getPhaseById(id: number): Promise<PhaseType | null>;
    getPhasesByWbsId(wbsId: number): Promise<WbsPhaseType[]>;
    updateWbsPhase(args: { id: number; wbsId: number; name?: string; code?: string; seq?: number }): Promise<{ success: boolean; error?: string; phase?: WbsPhaseType }>;
    deleteWbsPhase(id: number): Promise<{ success: boolean; error?: string }>;
}

/**
 * 工程テンプレートアプリケーションサービス
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

    /**
     * 工程テンプレートを更新
     * @param phase 工程テンプレート
     * @returns 工程テンプレート
     */
    public async updatePhaseTemplate(phase: { id: number, name: string, code: string, seq: number }): Promise<{ success: boolean, phase?: PhaseType }> {

        // 同じ工程名、工程コードがないことをチェック
        const cheackPhase = await this.phaseRepository.findAllTemplates();
        if (cheackPhase.some(p => p.id !== phase.id && (p.name === phase.name || p.code.value() === phase.code))) {
            return { success: false, phase: undefined };
        }

        const phaseDb = await this.phaseRepository.findById(phase.id);
        if (!phaseDb) {
            return { success: false, phase: undefined };
        }

        phaseDb.name = phase.name;
        phaseDb.code = new PhaseCode(phase.code);
        phaseDb.seq = phase.seq;

        const updatedPhaseDb = await this.phaseRepository.updateTemplate(phaseDb);
        return {
            success: true, phase: {
                id: updatedPhaseDb.id!,
                name: updatedPhaseDb.name,
                seq: updatedPhaseDb.seq,
                code: updatedPhaseDb.code.value(),
            }
        };
    }

    /**
     * フェーズをIDで取得
     * @param id フェーズID
     * @returns フェーズ
     */
    public async getPhaseById(id: number): Promise<PhaseType | null> {
        const phase = await this.phaseRepository.findById(id);
        if (!phase) return null;

        return {
            id: phase.id!,
            name: phase.name,
            seq: phase.seq,
            code: phase.code.value(),
        };
    }

    /**
     * 工程テンプレートをIDで取得
     * @param id 工程テンプレートID
     * @returns 工程テンプレート
     */
    public async getPhaseTemplateById(id: number): Promise<PhaseType | null> {
        const phase = await this.phaseRepository.findTemplateById(id);
        if (!phase) return null;

        return {
            id: phase.id!,
            name: phase.name,
            seq: phase.seq,
            code: phase.code.value(),
        };
    }

    /**
     * 工程テンプレートを削除
     * @param id 工程テンプレートID
     */
    public async deletePhaseTemplate(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            await this.phaseRepository.deleteTemplate(id);
            return { success: true };
        } catch {
            return { success: false, error: "工程テンプレートの削除に失敗しました。" };
        }
    }

    /**
     * WBSに紐づくフェーズ一覧を取得
     * @param wbsId WBS ID
     * @returns フェーズ一覧
     */
    public async getPhasesByWbsId(wbsId: number): Promise<WbsPhaseType[]> {
        const phases = await this.phaseRepository.findByWbsId(wbsId);

        return phases.map((phase) => ({
            id: phase.id!,
            name: phase.name,
            seq: phase.seq,
            code: phase.code.value(),
            wbsId,
        }));
    }

    /**
     * WBSフェーズを更新
     * @param args 更新内容
     * @returns 更新後のフェーズ
     */
    public async updateWbsPhase(args: { id: number; wbsId: number; name?: string; code?: string; seq?: number }): Promise<{ success: boolean; error?: string; phase?: WbsPhaseType }> {
        const phase = await this.phaseRepository.findById(args.id);
        if (!phase) {
            return { success: false, error: "フェーズが存在しません。" };
        }

        if (args.name !== undefined) phase.name = args.name;
        if (args.code !== undefined) phase.code = new PhaseCode(args.code);
        if (args.seq !== undefined) phase.seq = args.seq;

        try {
            const updated = await this.phaseRepository.update(args.wbsId, String(args.id), phase);
            return {
                success: true,
                phase: {
                    id: updated.id!,
                    name: updated.name,
                    seq: updated.seq,
                    code: updated.code.value(),
                    wbsId: args.wbsId,
                },
            };
        } catch {
            return { success: false, error: "フェーズの更新に失敗しました。" };
        }
    }

    /**
     * WBSフェーズを削除
     * @param id フェーズID
     */
    public async deleteWbsPhase(id: number): Promise<{ success: boolean; error?: string }> {
        try {
            await this.phaseRepository.delete(String(id));
            return { success: true };
        } catch {
            return { success: false, error: "フェーズの削除に失敗しました。" };
        }
    }
}
