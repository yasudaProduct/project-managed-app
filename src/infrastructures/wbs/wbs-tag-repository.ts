import { IWbsTagRepository } from "@/applications/wbs/iwbs-tag-repository";
import { WbsTag } from "@/domains/wbs/wbs-tag";
import prisma from "@/lib/prisma/prisma";
import { injectable } from "inversify";

@injectable()
export class WbsTagRepository implements IWbsTagRepository {

    async findByWbsId(wbsId: number): Promise<WbsTag[]> {
        const tagsDb = await prisma.wbsTag.findMany({
            where: { wbsId },
            orderBy: { name: 'asc' },
        });

        return tagsDb.map(t => WbsTag.createFromDb({
            id: t.id,
            wbsId: t.wbsId,
            name: t.name,
        }));
    }

    async findAllDistinctNames(): Promise<string[]> {
        const result = await prisma.wbsTag.findMany({
            select: { name: true },
            distinct: ['name'],
            orderBy: { name: 'asc' },
        });

        return result.map(r => r.name);
    }

    async addTag(wbsId: number, name: string): Promise<WbsTag> {
        const tagDb = await prisma.wbsTag.create({
            data: { wbsId, name },
        });

        return WbsTag.createFromDb({
            id: tagDb.id,
            wbsId: tagDb.wbsId,
            name: tagDb.name,
        });
    }

    async removeTag(wbsId: number, name: string): Promise<void> {
        await prisma.wbsTag.delete({
            where: {
                wbsId_name: { wbsId, name },
            },
        });
    }

    async findWbsIdsByTagNames(tagNames: string[]): Promise<number[]> {
        const result = await prisma.wbsTag.findMany({
            where: {
                name: { in: tagNames },
            },
            select: { wbsId: true },
            distinct: ['wbsId'],
        });

        return result.map(r => r.wbsId);
    }
}
