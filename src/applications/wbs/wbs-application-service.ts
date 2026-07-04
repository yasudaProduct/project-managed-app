import type { Assignee as AssigneeType, Wbs as WbsType, WbsBuffer } from "@/types/wbs";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IWbsRepository } from "./iwbs-repository";
import { Wbs } from "@/domains/wbs/wbs";
import type { IWbsAssigneeRepository } from "./iwbs-assignee-repository";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import type { IPhaseRepository } from "../task/iphase-repository";
import type { IWbsBufferRepository } from "./iwbs-buffer-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

export interface IWbsApplicationService {
    getWbsById(id: number): Promise<WbsType | null>;
    getWbsAll(projectId?: string): Promise<WbsType[] | null>;
    getLatestWbsByProjectId(projectId: string): Promise<WbsType | null>;
    createWbs(args: { name: string; projectId: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    updateWbs(args: { id: number; name?: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteWbs(id: number): Promise<{ success: boolean; error?: string; id?: number }>;
    createWbsPhase(args: { wbsId: number; name: string; code: string; seq: number; templateId?: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    getAssignees(wbsId: number): Promise<{ assignee: AssigneeType | null, wbsId: number }[] | null>;
    getAssigneeById(id: number): Promise<{ assignee: AssigneeType | null, wbsId?: number }>;
    createAssignee(args: { wbsId: number; assigneeId: string; rate: number; costPerHour: number; seq: number }): Promise<{ success: boolean; error?: string; id?: number }>;
    updateAssignee(args: { id: number; assigneeId: string; rate: number; costPerHour: number; seq: number }): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteAssignee(id: number): Promise<{ success: boolean; error?: string; id?: number }>;
    getPhases(wbsId: number): Promise<{ id: number; name: string; seq: number; code: string; startDate: Date; endDate: Date; }[]>;
    getBuffers(wbsId: number): Promise<WbsBuffer[]>;
}

@injectable()
export class WbsApplicationService implements IWbsApplicationService {

    constructor(
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
        @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
        @inject(SYMBOL.IPhaseRepository) private readonly phaseRepository: IPhaseRepository,
        @inject(SYMBOL.IWbsBufferRepository) private readonly wbsBufferRepository: IWbsBufferRepository,
    ) { }

    public async getWbsById(id: number): Promise<WbsType | null> {
        const wbs = await this.wbsRepository.findById(id);
        if (!wbs) return null;
        return {
            id: wbs.id!,
            name: wbs.name,
            projectId: wbs.projectId,
        };
    }

    public async getWbsAll(projectId?: string): Promise<WbsType[] | null> {

        let wbs: Wbs[] | null = null;
        if (projectId) {
            wbs = await this.wbsRepository.findByProjectId(projectId);
        } else {
            wbs = await this.wbsRepository.findAll();
        }

        return wbs.map((wbs) => {
            return {
                id: wbs.id!,
                name: wbs.name,
                projectId: wbs.projectId,
            }
        })
    }

    public async getLatestWbsByProjectId(projectId: string): Promise<WbsType | null> {
        const wbsList = await this.wbsRepository.findByProjectId(projectId);
        if (wbsList.length === 0) return null;

        const latest = wbsList[wbsList.length - 1];
        return {
            id: latest.id!,
            name: latest.name,
            projectId: latest.projectId,
        };
    }

    public async createWbs(args: { name: string; projectId: string }): Promise<{ success: boolean; error?: string; id?: number }> {
        const wbs = Wbs.create({
            name: args.name,
            projectId: args.projectId,
        });

        // TODO　ドメインロジックで重複チェック
        // const check = await this.wbsRepository.findByName(wbs.name);
        // if (check) {
        //     return { success: false, error: "同名のwbsが存在します。" }
        // }

        const newWbs = await this.wbsRepository.create(wbs);
        return { success: true, id: newWbs.id }
    }

    public async updateWbs(args: { id: number; name?: string }): Promise<{ success: boolean; error?: string; id?: number }> {
        const wbs = await this.wbsRepository.findById(args.id);
        if (!wbs) return { success: false, error: "wbsが存在しません。" }

        if (args.name) wbs.updateName(args.name);

        const udpatedWbs = await this.wbsRepository.update(wbs);
        return { success: true, id: udpatedWbs.id }
    }

    public async deleteWbs(id: number): Promise<{ success: boolean; error?: string; id?: number }> {
        await this.wbsRepository.delete(id);

        return { success: true, id: id }
    }

    public async createWbsPhase(args: { wbsId: number; name: string; code: string; seq: number; templateId?: string }): Promise<{ success: boolean; error?: string; id?: number }> {
        const existingPhases = await this.phaseRepository.findByWbsId(args.wbsId);
        if (existingPhases.some((phase) => phase.name === args.name)) {
            return { success: false, error: "すでにフェーズが存在します。" };
        }

        const templateId = args.templateId && args.templateId !== "new"
            ? Number(args.templateId)
            : undefined;

        const phase = Phase.create({
            name: args.name,
            code: new PhaseCode(args.code),
            seq: args.seq,
            templateId,
        });

        const created = await this.phaseRepository.create(args.wbsId, phase);
        return { success: true, id: created.id };
    }

    public async getAssignees(wbsId: number): Promise<{ assignee: AssigneeType | null, wbsId: number }[] | null> {
        const assignees: WbsAssignee[] = await this.wbsAssigneeRepository.findByWbsId(wbsId);

        return assignees.map((assignee) => {
            return {
                wbsId: wbsId,
                assignee: {
                    id: assignee.id!,
                    userId: assignee.userId,
                    name: assignee.userName!,
                    displayName: assignee.userName!,
                    rate: assignee.getRate() ?? 0,
                    costPerHour: assignee.getCostPerHour() ?? 5000,
                    seq: assignee.seq,
                },
            }
        });
    }

    public async getAssigneeById(id: number): Promise<{ assignee: AssigneeType | null, wbsId?: number }> {
        const assignee = await this.wbsAssigneeRepository.findById(id);
        if (!assignee) return { assignee: null, wbsId: undefined };
        return {
            wbsId: assignee.wbsId,
            assignee: {
                id: assignee.id!,
                userId: assignee.userId,
                name: assignee.userName!,
                displayName: assignee.userName!,
                rate: assignee.getRate() ?? 0,
                costPerHour: assignee.getCostPerHour() ?? 5000,
                seq: assignee.seq,
            },
        }
    }

    public async createAssignee(args: { wbsId: number; assigneeId: string; rate: number; costPerHour: number; seq: number }): Promise<{ success: boolean; error?: string; id?: number }> {
        const existingAssignees = await this.wbsAssigneeRepository.findByWbsId(args.wbsId);
        if (existingAssignees.some((assignee) => assignee.userId === args.assigneeId)) {
            return { success: false, error: "この担当者はすでに追加されています。" };
        }

        const assignee = WbsAssignee.create({
            wbsId: args.wbsId,
            userId: args.assigneeId,
            rate: args.rate,
            costPerHour: args.costPerHour,
            seq: args.seq,
        });

        const created = await this.wbsAssigneeRepository.create(args.wbsId, assignee);
        return { success: true, id: created.id };
    }

    public async updateAssignee(args: { id: number; assigneeId: string; rate: number; costPerHour: number; seq: number }): Promise<{ success: boolean; error?: string; id?: number }> {
        const existing = await this.wbsAssigneeRepository.findById(args.id);
        if (!existing) return { success: false, error: "担当者が存在しません。" };

        const updated = WbsAssignee.createFromDb({
            id: args.id,
            wbsId: existing.wbsId,
            userId: args.assigneeId,
            rate: args.rate,
            costPerHour: args.costPerHour,
            seq: args.seq,
        });

        const result = await this.wbsAssigneeRepository.update(updated);
        return { success: true, id: result.id };
    }

    public async deleteAssignee(id: number): Promise<{ success: boolean; error?: string; id?: number }> {
        // TODO 担当者が担当しているタスクは担当者IDをnullにする
        const assignee = await this.wbsAssigneeRepository.findById(id);
        if (!assignee) return { success: false, error: "担当者が存在しません。" };

        await this.wbsAssigneeRepository.delete(id);
        return { success: true, id };
    }

    public async getPhases(wbsId: number): Promise<{ id: number; name: string; seq: number; code: string; startDate: Date; endDate: Date; }[]> {
        const phases = await this.phaseRepository.findByWbsId(wbsId);

        return phases.map(phase => ({
            id: phase.id!,
            name: phase.name,
            seq: phase.seq,
            code: String(phase.code),
            startDate: phase.period?.start ?? new Date(0),
            endDate: phase.period?.end ?? new Date(0),
        }));
    }

    public async getBuffers(wbsId: number): Promise<WbsBuffer[]> {
        return this.wbsBufferRepository.findByWbsId(wbsId);
    }
}
