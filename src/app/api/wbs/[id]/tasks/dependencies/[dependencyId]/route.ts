import { container } from "@/lib/inversify.config";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { SYMBOL } from "@/types/symbol";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; dependencyId: string }> }
) {
    try {
        const resolvedParams = await params;
        const dependencyId = parseInt(resolvedParams.dependencyId);
        if (isNaN(dependencyId)) {
            return NextResponse.json(
                { error: "無効な依存関係IDです" },
                { status: 400 }
            );
        }

        const taskDependencyService = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        await taskDependencyService.deleteDependency(dependencyId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting task dependency:", error);
        
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "依存関係の削除に失敗しました" },
            { status: 500 }
        );
    }
}