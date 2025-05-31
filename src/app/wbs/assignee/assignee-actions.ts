"use server"

import prisma from "@/lib/prisma";
import { container } from "@/lib/inversify.config";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { SYMBOL } from "@/types/symbol";
import { Assignee as AssigneeType } from "@/types/wbs";

const wbsApplicationService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);

export async function getUsers() {
    return await prisma.users.findMany({
        select: {
            id: true,
            name: true,
            displayName: true,
        },
    });
}

export async function getWbsAssignees(wbsId: number): Promise<{ assignee: AssigneeType | null, wbsId: number }[] | null> {
    return await wbsApplicationService.getAssignees(wbsId);
}

export async function getWbsAssigneeById(id: number): Promise<{ assignee: AssigneeType | null, wbsId?: number }> {
    return await wbsApplicationService.getAssigneeById(id);
}