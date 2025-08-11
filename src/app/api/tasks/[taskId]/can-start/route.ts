import { container } from "@/lib/inversify.config";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { SYMBOL } from "@/types/symbol";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const resolvedParams = await params;
        const taskId = parseInt(resolvedParams.taskId);
        if (isNaN(taskId)) {
            return NextResponse.json(
                { error: "無効なタスクIDです" },
                { status: 400 }
            );
        }

        const taskDependencyService = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        const result = await taskDependencyService.canStartTask(taskId);

        return NextResponse.json({
            canStart: result.canStart,
            blockingPredecessors: result.blockingPredecessors.map(dep => ({
                id: dep.id,
                predecessorTaskId: dep.predecessorTaskId,
                successorTaskId: dep.successorTaskId,
                wbsId: dep.wbsId,
            }))
        });
    } catch (error) {
        console.error("Error checking task start capability:", error);
        return NextResponse.json(
            { error: "タスク開始可能性のチェックに失敗しました" },
            { status: 500 }
        );
    }
}