"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IScheduleApplicationService } from "@/applications/schedule/schedule-application-service";
import type { IUserApplicationService } from "@/applications/user/user-application-service";
import type { scheduleTsvData } from "@/types/csv";
import type { ScheduleEntry } from "@/types/schedule";
import type { ActionResult } from "@/types/action-result";

export type { ScheduleEntry };

function getScheduleApplicationService(): IScheduleApplicationService {
    return container.get<IScheduleApplicationService>(SYMBOL.IScheduleApplicationService);
}

function getUserApplicationService(): IUserApplicationService {
    return container.get<IUserApplicationService>(SYMBOL.IUserApplicationService);
}

export async function getSchedules(): Promise<ScheduleEntry[]> {
    return getScheduleApplicationService().getSchedules();
}

export async function getUsers(): Promise<Array<{ id: string, name: string, email: string }>> {
    const users = await getUserApplicationService().getAllUsers();

    return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
    }));
}

// 取り込み元は TSV パーサが生成した配列。識別に必須の列と構造だけを検証し、
// 任意列は passthrough で許容する（正規のインポートを過度に弾かない）。
const importScheduleTsvSchema = z
    .array(
        z
            .object({
                '個人ｺｰﾄﾞ': z.string().min(1),
                '年月日': z.string().min(1),
                '開始時間': z.string(),
                '終了時間': z.string(),
            })
            .passthrough()
    )
    .min(1, "取り込むデータがありません。");

export async function importScheduleTsv(tsvData: scheduleTsvData[]): Promise<ActionResult<void>> {
    const parsed = importScheduleTsvSchema.safeParse(tsvData);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    const result = await getScheduleApplicationService().importScheduleTsv(tsvData);
    if (!result.success) {
        return { success: false, error: result.error ?? "スケジュールのインポートに失敗しました" };
    }

    return { success: true, data: undefined };
}
