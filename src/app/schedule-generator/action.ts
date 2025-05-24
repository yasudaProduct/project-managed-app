"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service";
import { taskCsvData } from "@/types/csv";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IScheduleGenerateService } from "@/applications/schedule-generator/schedule-generate.service";

const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);
const scheduleGenerateService = container.get<IScheduleGenerateService>(SYMBOL.IScheduleGenerateService);

export async function getProjects() {
    const projects = await projectApplicationService.getProjectAll();
    return projects;
}

/**
 * タスクのcsvデータからタスクの開始日、終了日を生成する
 * ・タスクの開始日は、プロジェクトの開始日とする
 * ・1日の基準時間は7.5時間とする
 * ・担当者のスケジュールを考慮する。
 * ・担当者の参画率を考慮する。
 * ・土日、祝日は作業しない。
 * @param csv タスクのCSVデータ
 * @param wbsId タスクのWBS ID
 * @returns タスクのスケジュール
 */

export async function generateSchedule(csv: taskCsvData[], wbsId: number): Promise<{ success: boolean; error?: string; schedule?: { [assigneeId: string]: { date: string; taskName: string; hours: number }[] } }> {

    // サービス呼び出し
    const schedule = await scheduleGenerateService.generateSchedule(csv, wbsId);

    return schedule;

}
