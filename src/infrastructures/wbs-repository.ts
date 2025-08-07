import { Wbs } from "@/domains/wbs/wbs";
import { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import { injectable } from "inversify";
import prisma from "@/lib/prisma";

@injectable()
export class WbsRepository implements IWbsRepository {


    async findById(id: number): Promise<Wbs | null> {

        const wbs = await prisma.wbs.findUnique({
            where: { id },
        });

        if (!wbs) return null;

        return Wbs.createFromDb({
            id: wbs.id,
            name: wbs.name,
            projectId: wbs.projectId,
        });
    }

    async findByProjectId(projectId: string): Promise<Wbs[]> {

        const wbsList = await prisma.wbs.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });

        return wbsList.map(wbs => Wbs.createFromDb({
            id: wbs.id,
            name: wbs.name,
            projectId: wbs.projectId,
        }));

    }

    async findAll(): Promise<Wbs[]> {
        const wbsList = await prisma.wbs.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return wbsList.map(wbs => Wbs.createFromDb({
            id: wbs.id,
            name: wbs.name,
            projectId: wbs.projectId,
        }));
    }

    async create(wbs: Omit<Wbs, 'id'>): Promise<Wbs> {
        const createdWbs = await prisma.wbs.create({
            data: {
                name: wbs.name,
                projectId: wbs.projectId,
            },
        });

        return Wbs.createFromDb({
            id: createdWbs.id,
            name: createdWbs.name,
            projectId: createdWbs.projectId,
        });
    }

    async update(wbs: Wbs): Promise<Wbs> {
        const updatedWbs = await prisma.wbs.update({
            where: { id: wbs.id },
            data: {
                name: wbs.name,
                projectId: wbs.projectId,
            },
        });

        return Wbs.createFromDb({
            id: updatedWbs.id,
            name: updatedWbs.name,
            projectId: updatedWbs.projectId,
        });
    }

    async save(wbs: Wbs): Promise<Wbs> {
        if (wbs.id) {
            return this.update(wbs);
        } else {
            return this.create(wbs);
        }
    }

    async exists(id: number): Promise<boolean> {
        const wbs = await prisma.wbs.findUnique({
            where: { id },
        });
        return wbs !== null;
    }

    async delete(id: number): Promise<void> {
        await prisma.wbs.delete({
            where: { id },
        });
    }
}