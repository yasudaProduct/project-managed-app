import type { IWbsBufferRepository } from "@/applications/wbs/iwbs-buffer-repository";
import type { WbsBuffer } from "@/types/wbs";
import prisma from "@/lib/prisma/prisma";
import { injectable } from "inversify";

@injectable()
export class WbsBufferRepository implements IWbsBufferRepository {
    async findByWbsId(wbsId: number): Promise<WbsBuffer[]> {
        const buffers = await prisma.wbsBuffer.findMany({
            where: { wbsId },
        });

        return buffers.map((buffer) => ({
            id: buffer.id,
            wbsId: buffer.wbsId,
            name: buffer.name,
            buffer: buffer.buffer,
            bufferType: buffer.bufferType,
        }));
    }
}
