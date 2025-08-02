"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TaskProgressProps {
    totalTasks: number;
    completedTasks: number;
    tasksByStatus: { status: string; count: number; percentage: number }[];
}

const STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: "未開始",
    IN_PROGRESS: "進行中",
    COMPLETED: "完了",
    ON_HOLD: "保留",
    CANCELLED: "中止"
};

const STATUS_COLORS: Record<string, string> = {
    NOT_STARTED: "#94a3b8",
    IN_PROGRESS: "#3b82f6",
    COMPLETED: "#22c55e",
    ON_HOLD: "#f59e0b",
    CANCELLED: "#ef4444"
};

export default function TaskProgress({ totalTasks, completedTasks, tasksByStatus }: TaskProgressProps) {
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const chartData = tasksByStatus.map(item => ({
        status: STATUS_LABELS[item.status] || item.status,
        count: item.count,
        fill: STATUS_COLORS[item.status] || "#6b7280"
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>タスク進捗状況</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">全体進捗率</span>
                        <span className="text-sm text-muted-foreground">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                        {completedTasks} / {totalTasks} タスク完了
                    </p>
                </div>

                <div className="pt-4">
                    <h4 className="text-sm font-medium mb-4">ステータス別タスク数</h4>
                    {totalTasks > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                            タスクデータがありません
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}