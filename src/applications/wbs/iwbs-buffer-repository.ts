import type { WbsBuffer } from "@/types/wbs";

export interface IWbsBufferRepository {
    findByWbsId(wbsId: number): Promise<WbsBuffer[]>;
}
