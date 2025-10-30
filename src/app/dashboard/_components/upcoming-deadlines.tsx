"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

interface UpcomingDeadlinesProps {
    upcomingDeadlines: { projectId: string; projectName: string; endDate: Date; daysRemaining: number }[];
    overdueProjects: { projectId: string; projectName: string; endDate: Date; daysOverdue: number }[];
}

export default function UpcomingDeadlines({ upcomingDeadlines, overdueProjects }: UpcomingDeadlinesProps) {
    const formatDate = (date: Date) => {
        return format(new Date(date), "yyyy年MM月dd日", { locale: ja });
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    期限情報
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        期限超過プロジェクト ({overdueProjects.length})
                    </h4>
                    {overdueProjects.length > 0 ? (
                        <ul className="space-y-2">
                            {overdueProjects.map((project) => (
                                <li key={project.projectId} className="border-l-2 border-red-500 pl-3">
                                    <Link 
                                        href={`/projects/${project.projectId}`}
                                        className="hover:underline"
                                    >
                                        <p className="font-medium text-sm">{project.projectName}</p>
                                    </Link>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>期限: {formatDate(project.endDate)}</span>
                                        <Badge variant="destructive" className="text-xs">
                                            {project.daysOverdue}日超過
                                        </Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">期限超過のプロジェクトはありません</p>
                    )}
                </div>

                <div>
                    <h4 className="text-sm font-medium mb-3">
                        今後7日以内の期限 ({upcomingDeadlines.length})
                    </h4>
                    {upcomingDeadlines.length > 0 ? (
                        <ul className="space-y-2">
                            {upcomingDeadlines.map((project) => (
                                <li key={project.projectId} className="border-l-2 border-yellow-500 pl-3">
                                    <Link 
                                        href={`/projects/${project.projectId}`}
                                        className="hover:underline"
                                    >
                                        <p className="font-medium text-sm">{project.projectName}</p>
                                    </Link>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>期限: {formatDate(project.endDate)}</span>
                                        <Badge variant="outline" className="text-xs">
                                            残り{project.daysRemaining}日
                                        </Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">7日以内に期限を迎えるプロジェクトはありません</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}