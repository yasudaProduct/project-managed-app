import { isHoliday } from "@/lib/utils";
import { Wbs } from "./wbs";
import { Project } from "../project/project";
import { WbsAssignee } from "./wbs-assignee";

// 稼働可能時間を取得
export class GetOperationPossible {

    constructor(
    ) {
    }

    async execute(project: Project, wbs: Wbs, assignee: WbsAssignee): Promise<{ [key: string]: number }> {
        const operationPossible: { [key: string]: number } = {};

        // プロジェクト開始日から終了日まで1日づつループ
        for (let date = new Date(project.startDate); date <= new Date(project.endDate); date.setDate(date.getDate() + 1)) {
            const ymd = date.toISOString().slice(0, 10);

            // 土日祝日の場合
            if (isHoliday(date)) {
                operationPossible[ymd] = 0;
                continue;
            }

            // 稼働可能時間
            const availableHours = 7.5; // TODO 外部から取得

            // (基準時間 - 他の予定時間) と (基準時間 * 稼働時間) の小さい方
            operationPossible[ymd] = Math.min(availableHours - (operationPossible[ymd] || 0), availableHours * assignee.getRate());
        }

        return operationPossible;
    }
}
