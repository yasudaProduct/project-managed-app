import { WbsTag } from "@/domains/wbs/wbs-tag";

export interface IWbsTagRepository {
    findByWbsId(wbsId: number): Promise<WbsTag[]>;
    findAllDistinctNames(): Promise<string[]>;
    addTag(wbsId: number, name: string): Promise<WbsTag>;
    removeTag(wbsId: number, name: string): Promise<void>;
    findWbsIdsByTagNames(tagNames: string[]): Promise<number[]>;
}
