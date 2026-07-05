"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import type { DependencyType } from "@/types/task-dependency";

export async function createGanttDependency(
    wbsId: number,
    data: {
        predecessorTaskId: number;
        successorTaskId: number;
        type?: DependencyType;
        lag?: number;
    }
): Promise<{
    success: boolean;
    dependency?: {
        id: number;
        predecessorTaskId: number;
        successorTaskId: number;
        type: DependencyType;
        lag: number;
    };
    error?: string;
}> {
    try {
        const service = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        const created = await service.createDependency({
            predecessorTaskId: data.predecessorTaskId,
            successorTaskId: data.successorTaskId,
            wbsId,
            type: data.type,
            lag: data.lag,
        });

        revalidatePath(`/wbs/${wbsId}/ganttv3`);

        return {
            success: true,
            dependency: {
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
): Promise<{ success: boolean; error?: string }> {
    try {
        const service = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        await service.deleteDependency(dependencyId, wbsId);

        revalidatePath(`/wbs/${wbsId}/ganttv3`);

        return { success: true };
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
