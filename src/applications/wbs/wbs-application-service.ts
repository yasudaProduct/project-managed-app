import type { Assignee as AssigneeType, Wbs as WbsType } from "@/types/wbs";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IWbsRepository } from "./iwbs-repository";
import { Wbs } from "@/domains/wbs/wbs";
import type { IWbsAssigneeRepository } from "./iwbs-assignee-repository";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

export interface IWbsApplicationService {
    getWbsById(id: number): Promise<WbsType | null>;
    getWbsAll(projectId?: string): Promise<WbsType[] | null>;
    createWbs(args: { name: string; projectId: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    updateWbs(args: { id: number; name?: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteWbs(id: number): Promise<{ success: boolean; error?: string; id?: number }>;
    getAssignees(wbsId: number): Promise<{ assignee: AssigneeType | null, wbsId: number }[] | null>;
    getAssigneeById(id: number): Promise<{ assignee: AssigneeType | null, wbsId?: number }>;
}

@injectable()
export class WbsApplicationService implements IWbsApplicationService {

    constructor(
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
        @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository
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
                },
            }
        });
    }

    public async getAssigneeById(id: number): Promise<{ assignee: AssigneeType | null, wbsId?: number }> {
        const assignee = await this.wbsAssigneeRepository.findById(id);
        if (!assignee) return { assignee: null, wbsId: undefined };
        return {
            wbsId: assignee.id!,
            assignee: {
                id: assignee.id!,
                userId: assignee.userId,
                name: assignee.userName!,
                displayName: assignee.userName!,
                rate: assignee.getRate() ?? 0,
            },
        }
    }
}
