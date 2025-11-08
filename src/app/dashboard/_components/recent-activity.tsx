"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, PlayCircle, PauseCircle, XCircle } from "lucide-react";

interface ActivityItem {
    id: string;
    type: "task_completed" | "task_started" | "task_paused" | "task_cancelled" | "project_created" | "project_updated";
    title: string;
    description: string;
    timestamp: Date;
}

const mockActivities: ActivityItem[] = [
    {
        id: "1",
        type: "task_completed",
        title: "タスク完了",
        description: "要件定義書の作成が完了しました",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
        id: "2",
        type: "task_started",
        title: "タスク開始",
        description: "システム設計フェーズを開始しました",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
        id: "3",
        type: "project_created",
        title: "プロジェクト作成",
        description: "新規ECサイトプロジェクトが作成されました",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
        id: "4",
        type: "task_paused",
        title: "タスク保留",
        description: "UI/UXデザインが一時保留になりました",
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000)
    }
];

const activityIcons = {
    task_completed: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50" },
    task_started: { icon: PlayCircle, color: "text-blue-600", bgColor: "bg-blue-50" },
    task_paused: { icon: PauseCircle, color: "text-yellow-600", bgColor: "bg-yellow-50" },
    task_cancelled: { icon: XCircle, color: "text-red-600", bgColor: "bg-red-50" },
    project_created: { icon: Activity, color: "text-purple-600", bgColor: "bg-purple-50" },
    project_updated: { icon: Activity, color: "text-indigo-600", bgColor: "bg-indigo-50" }
};

export default function RecentActivity() {
    const formatTimestamp = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes}分前`;
        } else if (diffHours < 24) {
            return `${diffHours}時間前`;
        } else if (diffDays < 7) {
            return `${diffDays}日前`;
        } else {
            return date.toLocaleDateString("ja-JP");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    最近の活動(仮)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {mockActivities.length > 0 ? (
                        mockActivities.map((activity) => {
                            const { icon: Icon, color, bgColor } = activityIcons[activity.type];
                            return (
                                <div key={activity.id} className="flex items-start gap-3">
                                    <div className={`p-2 rounded-full ${bgColor}`}>
                                        <Icon className={`h-4 w-4 ${color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{activity.title}</p>
                                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatTimestamp(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            最近の活動はありません
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}