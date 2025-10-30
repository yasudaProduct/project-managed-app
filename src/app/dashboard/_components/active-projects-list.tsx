"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Folder } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

interface ActiveProjectsListProps {
    activeProjectsList: {
        projectId: string;
        projectName: string;
        startDate: Date;
        endDate: Date;
        progress: number;
        taskStats: {
            total: number;
            completed: number;
            inProgress: number;
        };
    }[];
}

export default function ActiveProjectsList({ activeProjectsList }: ActiveProjectsListProps) {
    const formatDate = (date: Date) => {
        return format(new Date(date), "yyyy年MM月dd日", { locale: ja });
    };

    const getRemainingDays = (endDate: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    進行中のプロジェクト
                </CardTitle>
            </CardHeader>
            <CardContent>
                {activeProjectsList.length > 0 ? (
                    <div className="space-y-4">
                        {activeProjectsList.map((project) => {
                            const remainingDays = getRemainingDays(project.endDate);
                            return (
                                <div
                                    key={project.projectId}
                                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <Link
                                            href={`/projects/${project.projectId}`}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            {project.projectName}
                                        </Link>
                                        <Badge 
                                            variant={remainingDays <= 7 ? "destructive" : "outline"}
                                            className="text-xs"
                                        >
                                            残り{remainingDays}日
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>開始: {formatDate(project.startDate)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>期限: {formatDate(project.endDate)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span>進捗率</span>
                                                <span className="font-medium">{project.progress}%</span>
                                            </div>
                                            <Progress value={project.progress} className="h-2" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        進行中のプロジェクトはありません
                    </p>
                )}
            </CardContent>
        </Card>
    );
}