"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, AlertCircle } from "lucide-react";

interface DashboardOverviewProps {
  stats: {
    totalProjects: number;
    activeProjects: number;
    overdueCount: number;
  };
}

export default function DashboardOverview({ stats }: DashboardOverviewProps) {
  const overviewCards = [
    {
      title: "総プロジェクト数",
      value: stats.totalProjects,
      subtitle: `アクティブ: ${stats.activeProjects}`,
      icon: Building,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "期限超過",
      value: stats.overdueCount,
      subtitle: "プロジェクト",
      icon: AlertCircle,
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewCards.map((card, index) => (
        <Card
          key={index}
          className="hover:shadow-lg transition-shadow duration-200"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
