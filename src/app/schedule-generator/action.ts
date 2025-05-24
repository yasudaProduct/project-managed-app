"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service";
import { taskCsvData } from "@/types/csv";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IScheduleGenerateService } from "@/applications/schedule-generator/schedule-generate.service";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { ProjectStatus } from "@/types/wbs";

const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);
const wbsApplicationService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);
const scheduleGenerateService = container.get<IScheduleGenerateService>(SYMBOL.IScheduleGenerateService);

export async function getProjects(): Promise<{
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: Date;
    endDate: Date;
    wbs: {
        id: number;
        name: string;
        assignees: {
            id: number;
            userId: string;
            name: string;
        }[];
    }[];
}[]> {
    const projects = await projectApplicationService.getProjectAll();

    if (!projects) {
        return [];
    }

    const wbs = await wbsApplicationService.getWbsAll();

    const wbsWithAssignees = await Promise.all(wbs?.map(async (wbs) => {
        const assignees = await wbsApplicationService.getAssignees(wbs.id);
        return {
            ...wbs,
            assignees: (assignees ?? []).map((assignee) => ({
                id: Number(assignee.id),
                userId: assignee.id,
                name: assignee.displayName,
            }))
        };
    }) ?? []);

    return projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        wbs: wbsWithAssignees.filter((wbs) => wbs.projectId === project.id).map((wbs) => ({
            id: wbs.id,
            name: wbs.name,
            assignees: wbs.assignees,
        })),
    }));
}

export async function generateSchedule(csv: taskCsvData[], wbsId: number): Promise<{ success: boolean; error?: string; schedule?: { [assigneeId: string]: { date: string; taskName: string; hours: number }[] } }> {

    // サービス呼び出し
    const schedule = await scheduleGenerateService.generateSchedule(csv, wbsId);

    return schedule;

}
