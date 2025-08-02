"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ProjectStatsProps {
    projectsByStatus: { status: string; count: number; percentage: number }[];
}

const STATUS_COLORS: Record<string, string> = {
    PLANNED: "#94a3b8",
    ACTIVE: "#3b82f6",
    COMPLETED: "#22c55e",
    ON_HOLD: "#f59e0b",
    CANCELLED: "#ef4444"
};

const STATUS_LABELS: Record<string, string> = {
    PLANNED: "計画中",
    ACTIVE: "進行中",
    COMPLETED: "完了",
    ON_HOLD: "保留",
    CANCELLED: "中止"
};

export default function ProjectStats({ projectsByStatus }: ProjectStatsProps) {
    const chartData = projectsByStatus.map(item => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || "#6b7280"
    }));

    const totalProjects = projectsByStatus.reduce((sum, item) => sum + item.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>プロジェクトステータス分布</CardTitle>
            </CardHeader>
            <CardContent>
                {totalProjects > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        プロジェクトデータがありません
                    </div>
                )}
            </CardContent>
        </Card>
    );
}