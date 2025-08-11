import { container } from "@/lib/inversify.config";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import { SYMBOL } from "@/types/symbol";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const wbsId = parseInt(resolvedParams.id);
        if (isNaN(wbsId)) {
            return NextResponse.json(
                { error: "無効なWBSIDです" },
                { status: 400 }
            );
        }

        const taskDependencyService = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        const dependencies = await taskDependencyService.getDependenciesByWbsId(wbsId);

        return NextResponse.json({
            dependencies: dependencies.map(dep => ({
                id: dep.id,
                predecessorTaskId: dep.predecessorTaskId,
                successorTaskId: dep.successorTaskId,
                wbsId: dep.wbsId,
                createdAt: dep.createdAt,
                updatedAt: dep.updatedAt,
            }))
        });
    } catch (error) {
        console.error("Error fetching task dependencies:", error);
        return NextResponse.json(
            { error: "依存関係の取得に失敗しました" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const wbsId = parseInt(resolvedParams.id);
        if (isNaN(wbsId)) {
            return NextResponse.json(
                { error: "無効なWBSIDです" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { predecessorTaskId, successorTaskId } = body;

        if (!predecessorTaskId || !successorTaskId) {
            return NextResponse.json(
                { error: "先行タスクIDと後続タスクIDは必須です" },
                { status: 400 }
            );
        }

        const taskDependencyService = container.get<TaskDependencyService>(
            SYMBOL.ITaskDependencyService
        );

        const dependency = await taskDependencyService.createDependency({
            predecessorTaskId: parseInt(predecessorTaskId),
            successorTaskId: parseInt(successorTaskId),
            wbsId,
        });

        return NextResponse.json({
            dependency: {
                id: dependency.id,
                predecessorTaskId: dependency.predecessorTaskId,
                successorTaskId: dependency.successorTaskId,
                wbsId: dependency.wbsId,
                createdAt: dependency.createdAt,
                updatedAt: dependency.updatedAt,
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating task dependency:", error);
        
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "依存関係の作成に失敗しました" },
            { status: 500 }
        );
    }
}