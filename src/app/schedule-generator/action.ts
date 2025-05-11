"use server"

import { IProjectApplicationService } from "@/applications/projects/project-application-service";
import { taskCsvData } from "@/types/csv";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";

const projectApplicationService = container.get<IProjectApplicationService>(SYMBOL.IProjectApplicationService);

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
 * @returns タスクのスケジュール
 */
export async function generateSchedule(csv: taskCsvData[], projectId: string) {
    const project = await projectApplicationService.getProjectById(projectId);
    if (!project) {
        throw new Error("プロジェクトが見つかりません");
    }

    // プロジェクトの開始日
    const projectStart = new Date(project.startDate);

    // 祝日リスト
    const holidays: string[] = [];

    // 参画率取得（仮: 1.0固定。実際はDBからassigneeごとに取得）
    const getAssigneeRate = async (assigneeId: string) => 1.0;

    // 土日・祝日判定
    const isHoliday = (date: Date) => {
        const day = date.getDay();
        const ymd = date.toISOString().slice(0, 10);
        return day === 0 || day === 6 || holidays.includes(ymd);
    };

    // 指定日数分、稼働日だけ進める
    const addWorkdays = (start: Date, days: number) => {
        const d = new Date(start);
        let added = 0;
        while (added < days) {
            d.setDate(d.getDate() + 1);
            if (!isHoliday(d)) added++;
        }
        return d;
    };

    // スケジュール生成
    const schedule = [];
    for (const row of csv) {
        const assigneeRate = await getAssigneeRate(row.assigneeId);
        const dailyHours = 7.5 * assigneeRate;
        const kosu = Number(row.kosu) || 0;
        const needDays = Math.ceil(kosu / dailyHours);

        // タスク開始日: プロジェクト開始日
        const startDate = new Date(projectStart);
        // タスク終了日: 稼働日だけ進める
        const endDate = addWorkdays(startDate, needDays - 1);

        schedule.push({
            ...row,
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
        });
    }

    return schedule;

}
