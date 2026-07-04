"use server";

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

export async function importScheduleTsv(tsvData: scheduleTsvData[]): Promise<ActionResult<void>> {
    const result = await getScheduleApplicationService().importScheduleTsv(tsvData);
    if (!result.success) {
        return { success: false, error: result.error ?? "スケジュールのインポートに失敗しました" };
    }

    return { success: true, data: undefined };
}
