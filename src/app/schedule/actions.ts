"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IScheduleApplicationService } from "@/applications/schedule/schedule-application-service";
import type { IUserApplicationService } from "@/applications/user/user-application-service";
import type { scheduleTsvData } from "@/types/csv";
import type { ScheduleEntry } from "@/types/schedule";
import type { ActionResult } from "@/types/action-result";
import type { ImportOutlookScheduleInput, OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";

function getScheduleApplicationService(): IScheduleApplicationService {
    return container.get<IScheduleApplicationService>(SYMBOL.IScheduleApplicationService);
}

function getUserApplicationService(): IUserApplicationService {
    return container.get<IUserApplicationService>(SYMBOL.IUserApplicationService);
}

export async function getSchedules(): Promise<ScheduleEntry[]> {
    return getScheduleApplicationService().getSchedules();
}

export async function getUsers(): Promise<Array<{ id: string, name: string, email: string, displayName: string }>> {
    const users = await getUserApplicationService().getAllUsers();

    return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
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

/** 1回のOutlookインポートで受け付ける最大行数（Server Actionの本文サイズ・処理時間の上限対策） */
const MAX_OUTLOOK_IMPORT_ROWS = 10000;

const optionalCell = z.string().optional();

const importOutlookScheduleSchema = z.object({
    userId: z.string().min(1, "取り込み先のユーザーを選択してください。"),
    rows: z
        .array(
            z.object({
                rowNumber: z.number().int().positive(),
                subject: z.string(),
                startDate: z.string(),
                startTime: optionalCell,
                endDate: optionalCell,
                endTime: optionalCell,
                allDay: optionalCell,
                location: optionalCell,
                description: optionalCell,
                showTimeAs: optionalCell,
            })
        )
        .min(1, "取り込むデータがありません。")
        .max(
            MAX_OUTLOOK_IMPORT_ROWS,
            `一度に取り込める予定は${MAX_OUTLOOK_IMPORT_ROWS}件までです。期間を分けてエクスポートしてください。`
        ),
});

/** 検証メッセージを利用者向けに出す項目（それ以外の形式不正は一般化したメッセージにする） */
const USER_FACING_ISSUE_PATHS = new Set(["userId", "rows"]);

export async function importOutlookSchedule(
    input: ImportOutlookScheduleInput
): Promise<ActionResult<OutlookScheduleImportSummaryDto>> {
    const parsed = importOutlookScheduleSchema.safeParse(input);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const isUserFacing = issue && issue.path.length === 1 && USER_FACING_ISSUE_PATHS.has(String(issue.path[0]));
        return { success: false, error: isUserFacing ? issue.message : "入力値が不正です。" };
    }

    const result = await getScheduleApplicationService().importOutlookSchedules(parsed.data);
    if (!result.success) {
        return { success: false, error: result.error };
    }

    revalidatePath("/schedule");
    return { success: true, data: result.data };
}
