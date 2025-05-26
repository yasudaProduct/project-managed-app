import { GetOperationPossible } from "@/domains/wbs/get-operation-possible";
import { SYMBOL } from "@/types/symbol";
import { inject } from "inversify";
import type { IWbsRepository } from "../wbs/iwbs-repository";
import type { IProjectRepository } from "../projects/iproject-repository";
import type { IWbsAssigneeRepository } from "../wbs/iwbs-assignee-repository";
import type { ITaskRepository } from "../task/itask-repository";
import { taskCsvData } from "@/types/csv";
import { ScheduleGenerate } from "@/domains/wbs/schedule-generate";

type ScheduleItem = {
    date: string;
    taskName: string;
    hours: number;
};

export type ScheduleGenerateResult = {
    success: boolean;
    error?: string;
    schedule?: {
        taskName: string;
        userId: string;
        startDate: string;
        endDate: string;
        totalHours: number;
    }[];
};

export interface IScheduleGenerateService {
    generateSchedule(taskData: taskCsvData[], wbsId: number): Promise<ScheduleGenerateResult>;
    getOperationPossibles(wbsId: number): Promise<{ [assigneeId: string]: { [date: string]: number } }>;
}

export class ScheduleGenerateService implements IScheduleGenerateService {

    constructor(
        @inject(SYMBOL.GetOperationPossible) private readonly getOperationPossible: GetOperationPossible,
        @inject(SYMBOL.IWbsRepository) private readonly wbsRepository: IWbsRepository,
        @inject(SYMBOL.IProjectRepository) private readonly projectRepository: IProjectRepository,
        @inject(SYMBOL.IWbsAssigneeRepository) private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
        @inject(SYMBOL.ITaskRepository) private readonly taskRepository: ITaskRepository,
        @inject(SYMBOL.ScheduleGenerate) private readonly scheduleGenerate: ScheduleGenerate,
    ) {
    }

    public async generateSchedule(taskData: taskCsvData[], wbsId: number): Promise<ScheduleGenerateResult> {
        const scheduleList: { [userId: string]: ScheduleItem[] } = {};

        // WBS取得
        const wbs = await this.wbsRepository.findById(wbsId);
        if (!wbs) {
            return { success: false, error: "WBSが見つかりません" };
        }

        const project = await this.projectRepository.findById(wbs.projectId);
        if (!project) {
            return { success: false, error: "プロジェクトが見つかりません" };
        }

        const assignees = await this.wbsAssigneeRepository.findByWbsId(wbs.id!);
        if (!assignees) {
            return { success: false, error: "担当者が見つかりません" };
        }

        for (const task of taskData) {

            const assignee = assignees.find((assignee) => assignee.userId === task.userId);
            if (!assignee) {
                return { success: false, error: `担当者「${task.userId}」が見つかりません` };
            }

            // 1. 稼働可能時間取得
            const operationPossible = await this.getOperationPossible.execute(project, wbs, assignee);

            // 2. タスクの開始日、終了日を生成
            const schedule = await this.scheduleGenerate.execute(project, operationPossible, [{
                name: task.name,
                kosu: task.kosu,
            }]);

            scheduleList[assignee.userId!] = schedule;

        }

        const schedule = Object.entries(scheduleList).flatMap(([assigneeId, schedule]) => schedule.map((item) => ({
            taskName: item.taskName,
            userId: assigneeId,
            startDate: item.date,
            endDate: item.date,
            totalHours: item.hours,
        })));

        const result: ScheduleGenerateResult = {
            success: true,
            schedule: schedule
        };

        return result;
    }

    public async getOperationPossibles(wbsId: number): Promise<{ [assigneeId: string]: { [date: string]: number } }> {

        const wbs = await this.wbsRepository.findById(wbsId);
        if (!wbs) {
            return {};
        }

        const project = await this.projectRepository.findById(wbs.projectId);
        if (!project) {
            return {};
        }

        const assignees = await this.wbsAssigneeRepository.findByWbsId(wbs.id!);
        if (!assignees) {
            return {};
        }

        const operationPossible: { [assigneeId: string]: { [date: string]: number } } = {};
        for (const assignee of assignees) {
            operationPossible[assignee.userId!] = await this.getOperationPossible.execute(project, wbs, assignee);
        }

        return operationPossible;

    }
}