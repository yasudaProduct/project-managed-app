import { Project } from "../project/project";

type ScheduleItem = {
    date: string;
    taskName: string;
    hours: number;
};

// スケジュールを生成
export class ScheduleGenerate {

    constructor(
    ) {
    }

    async execute(project: Project, operationPossible: { [date: string]: number }, taskData: { name: string, kosu: number }[]): Promise<ScheduleItem[]> {
        const schedule: ScheduleItem[] = [];
        const remainingHours: { [date: string]: number } = { ...operationPossible };

        // タスクの予定を作成
        // タスクの工数を稼働可能時間を考慮して、プロジェクト開始日から割り振っていく
        for (const task of taskData) {
            const startDate = new Date(project.startDate);
            const endDate = new Date(project.endDate);

            let taskHours = task.kosu; // タスクの工数

            for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
                const ymd = date.toISOString().slice(0, 10);

                // その日の残り稼働可能時間を取得
                const availableHours = remainingHours[ymd] || 0;

                if (availableHours <= 0) {
                    continue; // その日は稼働不可
                }

                // 稼働可能時間を超える場合は、稼働可能時間に合わせる
                if (availableHours < taskHours) {
                    // 稼働可能時間分だけ割り当て
                    schedule.push({
                        date: ymd,
                        taskName: task.name,
                        hours: availableHours,
                    });

                    // その日の残り時間を0にする
                    remainingHours[ymd] = 0;

                    // タスクの工数を減らす
                    taskHours -= availableHours;
                } else {
                    // 稼働可能時間を超えない場合は、タスクの工数に合わせる
                    schedule.push({
                        date: ymd,
                        taskName: task.name,
                        hours: taskHours,
                    });

                    // その日の残り時間を減らす
                    remainingHours[ymd] -= taskHours;

                    // タスクの工数を0にする
                    taskHours = 0;
                }

                // タスクの工数が0になったら、ループを抜ける
                if (taskHours === 0) {
                    break;
                }
            }
        }

        return schedule;
    }
}
