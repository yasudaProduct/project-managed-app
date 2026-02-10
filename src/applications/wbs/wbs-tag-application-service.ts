import { WbsTag } from "@/domains/wbs/wbs-tag";
import { IWbsTagRepository } from "./iwbs-tag-repository";

export interface IWbsTagApplicationService {
    getTagsByWbsId(wbsId: number): Promise<{ id: number; name: string }[]>;
    getAllTagNames(): Promise<string[]>;
    addTag(wbsId: number, name: string): Promise<{ id: number; name: string }>;
    removeTag(wbsId: number, name: string): Promise<void>;
}

export class WbsTagApplicationService implements IWbsTagApplicationService {
    constructor(private readonly tagRepository: IWbsTagRepository) {}

    async getTagsByWbsId(wbsId: number): Promise<{ id: number; name: string }[]> {
        const tags = await this.tagRepository.findByWbsId(wbsId);
        return tags.map(tag => ({
            id: tag.id!,
            name: tag.name,
        }));
    }

    async getAllTagNames(): Promise<string[]> {
        return this.tagRepository.findAllDistinctNames();
    }

    async addTag(wbsId: number, name: string): Promise<{ id: number; name: string }> {
        // ドメインバリデーションを利用
        WbsTag.create({ wbsId, name });

        const tag = await this.tagRepository.addTag(wbsId, name);
        return {
            id: tag.id!,
            name: tag.name,
        };
    }

    async removeTag(wbsId: number, name: string): Promise<void> {
        await this.tagRepository.removeTag(wbsId, name);
    }
}
