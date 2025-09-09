'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

interface Project {
  projectId: string;
  projectName: string;
  budgetAtCompletion: number;
  completionPercentage: number;
  overallHealthStatus: 'healthy' | 'warning' | 'critical';
  latestMetrics: {
    pv: number;
    ev: number;
    ac: number;
    date: string;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  } | null;
}

interface EvmProjectListProps {
  projects: Project[];
}

export function EvmProjectList({ projects }: EvmProjectListProps) {
  const router = useRouter();

  const getHealthStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getHealthStatusText = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return '良好';
      case 'warning':
        return '注意';
      case 'critical':
        return '危険';
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  };

  if (projects.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        プロジェクトデータがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card 
          key={project.projectId} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/evm/project/${project.projectId}`)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">{project.projectName}</h3>
                <p className="text-sm text-gray-500">ID: {project.projectId}</p>
              </div>
              <Badge 
                className={getHealthStatusColor(project.overallHealthStatus)}
                variant="outline"
              >
                {getHealthStatusText(project.overallHealthStatus)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">進捗率</p>
                <div className="mt-1">
                  <Progress value={project.completionPercentage} className="h-2" />
                  <p className="text-sm text-gray-500 mt-1">
                    {project.completionPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">総予算</p>
                <p className="text-lg font-semibold">
                  {formatNumber(project.budgetAtCompletion)} 時間
                </p>
              </div>

              {project.latestMetrics && (
                <div>
                  <p className="text-sm font-medium text-gray-600">最新更新</p>
                  <p className="text-sm">
                    {new Date(project.latestMetrics.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              )}
            </div>

            {project.latestMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="font-medium text-blue-600">PV</p>
                  <p>{formatNumber(project.latestMetrics.pv)}</p>
                </div>
                <div>
                  <p className="font-medium text-green-600">EV</p>
                  <p>{formatNumber(project.latestMetrics.ev)}</p>
                </div>
                <div>
                  <p className="font-medium text-red-600">AC</p>
                  <p>{formatNumber(project.latestMetrics.ac)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">CPI</p>
                  <p className={
                    project.latestMetrics.costPerformanceIndex >= 1 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }>
                    {project.latestMetrics.costPerformanceIndex.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">SPI</p>
                  <p className={
                    project.latestMetrics.schedulePerformanceIndex >= 1 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }>
                    {project.latestMetrics.schedulePerformanceIndex.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}