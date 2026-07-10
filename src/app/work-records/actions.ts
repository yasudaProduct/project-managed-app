"use server"

import { formatDate } from "@/utils/date-util";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { IWorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";

function getWorkRecordApplicationService(): IWorkRecordApplicationService {
    return container.get<IWorkRecordApplicationService>(SYMBOL.IWorkRecordApplicationService);
}

export async function getWorkRecords() {
    const workRecords = await getWorkRecordApplicationService().getWorkRecords();

    return workRecords.map((workRecord) => ({
        id: workRecord.id,
        userId: workRecord.userId,
        userName: workRecord.userName,
        taskNo: workRecord.taskNo ?? undefined,
        taskName: workRecord.taskName ?? undefined,
        date: formatDate(workRecord.date, "YYYY/MM/DD"),
        hours_worked: workRecord.hoursWorked,
    }));
}
