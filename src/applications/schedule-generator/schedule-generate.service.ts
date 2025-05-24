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

export interface IScheduleGenerateService {
    generateSchedule(taskData: taskCsvData[], wbsId: number): Promise<{ success: boolean; error?: string; schedule?: { [assigneeId: string]: ScheduleItem[] } }>;
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

    public async generateSchedule(taskData: taskCsvData[], wbsId: number): Promise<{ success: boolean; error?: string; schedule?: { [assigneeId: string]: ScheduleItem[] } }> {
        const scheduleList: { [assigneeId: string]: ScheduleItem[] } = {};

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

        for (const assignee of assignees) {

            // 稼働可能時間取得
            const operationPossible = await this.getOperationPossible.execute(project, wbs, assignee);

            // タスクの開始日、終了日を生成
            const taskDataForAssignee = taskData.filter((task) => task.assigneeId === assignee.userId);
            const schedule = await this.scheduleGenerate.execute(project, operationPossible, taskDataForAssignee);

            scheduleList[assignee.id!] = schedule;

        }

        return { success: true, schedule: scheduleList };
    }

}