
import type { Wbs as WbsType } from "@/types/wbs";
import { SYMBOL } from "@/types/symbol";
import { inject, injectable } from "inversify";
import type { IWbsRepository } from "./iwbs-repository";
import { Wbs } from "@/domains/wbs/wbs";

export interface IWbsApplicationService {
    getWbsById(id: number): Promise<WbsType | null>;
    getWbsAll(projectId?: string): Promise<WbsType[] | null>;
    createWbs(args: { name: string; projectId: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    updateWbs(args: { id: number; name?: string }): Promise<{ success: boolean; error?: string; id?: number }>;
    deleteWbs(id: number): Promise<{ success: boolean; error?: string; id?: number }>;
}

@injectable()
export class WbsApplicationService implements IWbsApplicationService {

    constructor(@inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository) {
    }

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
}
