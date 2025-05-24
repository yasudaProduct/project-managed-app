import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { injectable } from "inversify";
import prisma from "@/lib/prisma";

@injectable()
export class WbsAssigneeRepository implements IWbsAssigneeRepository {


    async findById(id: number): Promise<WbsAssignee | null> {

        const wbsAssignee = await prisma.wbsAssignee.findUnique({
            include: {
                assignee: true,
            },
            where: { id },
        });

        if (!wbsAssignee) return null;

        return WbsAssignee.createFromDb({
            id: wbsAssignee.id,
            userId: wbsAssignee.assignee.id,
            rate: wbsAssignee.rate,
            userName: wbsAssignee.assignee.name,
        });
    }

    async findByWbsId(wbsId: number): Promise<WbsAssignee[]> {

        const wbsAssigneeList = await prisma.wbsAssignee.findMany({
            where: { wbsId },
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: true,
            },
        });

        return wbsAssigneeList.map(wbsAssignee => WbsAssignee.createFromDb({
            id: wbsAssignee.id,
            userId: wbsAssignee.assignee.id,
            rate: wbsAssignee.rate,
            userName: wbsAssignee.assignee.name,
        }));

    }

    async findAll(): Promise<WbsAssignee[]> {
        const wbsAssigneeList = await prisma.wbsAssignee.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: true,
            },
        });

        return wbsAssigneeList.map(wbsAssignee => WbsAssignee.createFromDb({
            id: wbsAssignee.id,
            userId: wbsAssignee.assignee.id,
            rate: wbsAssignee.rate,
            userName: wbsAssignee.assignee.name,
        }));
    }

    async create(wbsId: number, wbsAssignee: Omit<WbsAssignee, 'id'>): Promise<WbsAssignee> {
        const createdWbsAssignee = await prisma.wbsAssignee.create({
            data: {
                wbsId: wbsId,
                assigneeId: wbsAssignee.userId,
                rate: wbsAssignee.getRate(),
            },
        });

        const user = await prisma.users.findUnique({
            where: { id: wbsAssignee.userId },
        });

        if (!user) throw new Error("User not found");

        return WbsAssignee.createFromDb({
            id: createdWbsAssignee.id,
            userId: createdWbsAssignee.assigneeId,
            rate: createdWbsAssignee.rate,
            userName: user.name,
        });
    }

    async update(wbsAssignee: WbsAssignee): Promise<WbsAssignee> {
        const updatedWbsAssignee = await prisma.wbsAssignee.update({
            where: { id: wbsAssignee.id },
            data: {
                rate: wbsAssignee.getRate(),
            },
        });

        const user = await prisma.users.findUnique({
            where: { id: wbsAssignee.userId },
        });

        if (!user) throw new Error("User not found");

        return WbsAssignee.createFromDb({
            id: updatedWbsAssignee.id,
            userId: updatedWbsAssignee.assigneeId,
            rate: updatedWbsAssignee.rate,
            userName: user.name,
        });
    }

    async delete(id: number): Promise<void> {
        await prisma.wbsAssignee.delete({
            where: { id },
        });
    }
}