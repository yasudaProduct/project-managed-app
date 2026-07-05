import { container } from "@/lib/inversify.config";
import type { ITaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { SYMBOL } from "@/types/symbol";
import { NextRequest } from "next/server";
import { createApiResponse, createApiError } from "@/lib/api-response";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; dependencyId: string }> }
) {
    try {
        const resolvedParams = await params;
        const dependencyId = parseInt(resolvedParams.dependencyId);
        if (isNaN(dependencyId)) {
            return createApiError("無効な依存関係IDです", 400);
        }
        const wbsId = parseInt(resolvedParams.id);
        if (isNaN(wbsId)) {
            return createApiError("無効なWBSIDです", 400);
        }

        const taskDependencyService = container.get<ITaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        // 別WBSの依存IDを渡して越境削除されないよう wbsId でスコープ検証する
        await taskDependencyService.deleteDependency(dependencyId, wbsId);

        return createApiResponse(null);
    } catch (error) {
        console.error("Error deleting task dependency:", error);

        if (error instanceof Error) {
            return createApiError(error.message, 400);
        }

        return createApiError("依存関係の削除に失敗しました", 500);
    }
}
