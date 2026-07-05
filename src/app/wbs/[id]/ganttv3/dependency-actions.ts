"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { ITaskDependencyService } from "@/applications/task-dependency/task-dependency-service";
import type { DependencyType } from "@/types/task-dependency";
import type { ActionResult } from "@/types/action-result";

const createDependencySchema = z.object({
    predecessorTaskId: z.number().int().positive(),
    successorTaskId: z.number().int().positive(),
    type: z.enum(["FS", "SS", "FF", "SF"]).optional(),
    lag: z.number().optional(),
});

export async function createGanttDependency(
    wbsId: number,
    data: {
        predecessorTaskId: number;
        successorTaskId: number;
        type?: DependencyType;
        lag?: number;
    }
): Promise<ActionResult<{
    id: number;
    predecessorTaskId: number;
    successorTaskId: number;
    type: DependencyType;
    lag: number;
}>> {
    const parsed = createDependencySchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    try {
        const service = container.get<ITaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        const created = await service.createDependency({
            predecessorTaskId: parsed.data.predecessorTaskId,
            successorTaskId: parsed.data.successorTaskId,
            wbsId,
            type: parsed.data.type,
            lag: parsed.data.lag,
        });

        revalidatePath(`/wbs/${wbsId}/ganttv3`);

        return {
            success: true,
            data: {
                id: created.id!,
                predecessorTaskId: created.predecessorTaskId,
                successorTaskId: created.successorTaskId,
                type: created.type,
                lag: created.lag,
            },
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "依存関係の作成に失敗しました",
        };
    }
}

export async function deleteGanttDependency(
    wbsId: number,
    dependencyId: number
): Promise<ActionResult<void>> {
    const parsed = z.number().int().positive().safeParse(dependencyId);
    if (!parsed.success) {
        return { success: false, error: "入力値が不正です。" };
    }

    try {
        const service = container.get<ITaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        await service.deleteDependency(dependencyId, wbsId);

        revalidatePath(`/wbs/${wbsId}/ganttv3`);

        return { success: true, data: undefined };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "依存関係の削除に失敗しました",
        };
    }
}
