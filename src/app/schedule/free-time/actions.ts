"use server";

import { z } from "zod";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IFreeTimeApplicationService } from "@/applications/schedule/free-time-application-service";
import type { ActionResult } from "@/types/action-result";
import type { FreeTimeSearchResultDto } from "@/types/free-time";

function getFreeTimeApplicationService(): IFreeTimeApplicationService {
    return container.get<IFreeTimeApplicationService>(SYMBOL.IFreeTimeApplicationService);
}

// 全条件が任意指定。省略時のデフォルト解決(全ユーザー/今日から1週間/フィルタなし)は
// Application Service 側の責務。
const searchFreeTimeSchema = z
    .object({
        userIds: z.array(z.string().min(1)).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        minDurationMinutes: z.number().int().positive().max(540).optional(),
    })
    .refine(
        // "YYYY-MM-DD" 同士は文字列比較で日付順になる
        (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
        { message: "終了日は開始日以降の日付を指定してください" }
    );

export async function searchFreeTime(
    input: z.infer<typeof searchFreeTimeSchema>
): Promise<ActionResult<FreeTimeSearchResultDto>> {
    const parsed = searchFreeTimeSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    try {
        const result = await getFreeTimeApplicationService().searchFreeTime(parsed.data);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, data: result.data };
    } catch (error) {
        console.error("searchFreeTime error:", error);
        return { success: false, error: "空き時間の検索に失敗しました" };
    }
}
