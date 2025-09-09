'use server';

import { container } from '@/lib/inversify.config';
import { EvmApplicationService } from '@/applications/evm/evm-application-service';
import { SYMBOL } from '@/types/symbol';

export interface EvmProjectData {
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

export interface EvmDashboardData {
  projects: EvmProjectData[];
  overallMetrics: {
    totalProjects: number;
    healthyProjects: number;
    warningProjects: number;
    criticalProjects: number;
    totalBudget: number;
    totalEarnedValue: number;
    totalActualCost: number;
    overallCpi: number;
    overallSpi: number;
  };
}

export interface ProjectEvmDetailData {
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
    costVariance: number;
    scheduleVariance: number;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
    estimateAtCompletion: number;
    estimateToComplete: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  } | null;
  cumulativeMetrics: Array<{
    date: string;
    cumulativePv: number;
    cumulativeEv: number;
    cumulativeAc: number;
  }>;
  estimatedCompletionDate: string | null;
  metrics: Array<{
    pv: number;
    ev: number;
    ac: number;
    date: string;
    costVariance: number;
    scheduleVariance: number;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  }>;
}

export async function getEvmDashboardData(): Promise<EvmDashboardData> {
  try {
    const evmService = container.get<EvmApplicationService>(SYMBOL.IEvmApplicationService);
    const dashboardData = await evmService.getEvmDashboardData();
    
    return {
      projects: dashboardData.projects.map(project => ({
        projectId: project.projectId,
        projectName: project.projectName,
        budgetAtCompletion: project.budgetAtCompletion,
        completionPercentage: project.completionPercentage,
        overallHealthStatus: project.overallHealthStatus,
        latestMetrics: project.latestMetrics ? {
          pv: project.latestMetrics.pv,
          ev: project.latestMetrics.ev,
          ac: project.latestMetrics.ac,
          date: project.latestMetrics.date.toISOString(),
          costPerformanceIndex: project.latestMetrics.costPerformanceIndex,
          schedulePerformanceIndex: project.latestMetrics.schedulePerformanceIndex,
          healthStatus: project.latestMetrics.healthStatus
        } : null
      })),
      overallMetrics: dashboardData.overallMetrics
    };
  } catch (error) {
    console.error('EVM Dashboard data error:', error);
    throw new Error('EVMデータの取得に失敗しました');
  }
}

export async function getProjectEvmData(projectId: string): Promise<ProjectEvmDetailData | null> {
  try {
    const evmService = container.get<EvmApplicationService>(SYMBOL.IEvmApplicationService);
    const projectEvmData = await evmService.getProjectEvmData(projectId);
    
    if (!projectEvmData) {
      return null;
    }

    return {
      projectId: projectEvmData.projectId,
      projectName: projectEvmData.projectName,
      budgetAtCompletion: projectEvmData.budgetAtCompletion,
      completionPercentage: projectEvmData.completionPercentage,
      overallHealthStatus: projectEvmData.overallHealthStatus,
      latestMetrics: projectEvmData.latestMetrics ? {
        pv: projectEvmData.latestMetrics.pv,
        ev: projectEvmData.latestMetrics.ev,
        ac: projectEvmData.latestMetrics.ac,
        date: projectEvmData.latestMetrics.date.toISOString(),
        costVariance: projectEvmData.latestMetrics.costVariance,
        scheduleVariance: projectEvmData.latestMetrics.scheduleVariance,
        costPerformanceIndex: projectEvmData.latestMetrics.costPerformanceIndex,
        schedulePerformanceIndex: projectEvmData.latestMetrics.schedulePerformanceIndex,
        estimateAtCompletion: projectEvmData.latestMetrics.estimateAtCompletion,
        estimateToComplete: projectEvmData.latestMetrics.estimateToComplete,
        healthStatus: projectEvmData.latestMetrics.healthStatus
      } : null,
      cumulativeMetrics: projectEvmData.cumulativeMetrics.map(metric => ({
        date: metric.date.toISOString(),
        cumulativePv: metric.cumulativePv,
        cumulativeEv: metric.cumulativeEv,
        cumulativeAc: metric.cumulativeAc
      })),
      estimatedCompletionDate: projectEvmData.estimatedCompletionDate?.toISOString() || null,
      metrics: projectEvmData.metrics.map(metric => ({
        pv: metric.pv,
        ev: metric.ev,
        ac: metric.ac,
        date: metric.date.toISOString(),
        costVariance: metric.costVariance,
        scheduleVariance: metric.scheduleVariance,
        costPerformanceIndex: metric.costPerformanceIndex,
        schedulePerformanceIndex: metric.schedulePerformanceIndex,
        healthStatus: metric.healthStatus
      }))
    };
  } catch (error) {
    console.error('Project EVM data error:', error);
    throw new Error('プロジェクトEVMデータの取得に失敗しました');
  }
}

export async function getProjectEvmDataByDateRange(
  projectId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const evmService = container.get<EvmApplicationService>(SYMBOL.IEvmApplicationService);
    const metrics = await evmService.getProjectEvmDataByDateRange(
      projectId,
      startDate,
      endDate
    );

    return {
      projectId,
      metrics: metrics.map(metric => ({
        pv: metric.pv,
        ev: metric.ev,
        ac: metric.ac,
        date: metric.date.toISOString(),
        costVariance: metric.costVariance,
        scheduleVariance: metric.scheduleVariance,
        costPerformanceIndex: metric.costPerformanceIndex,
        schedulePerformanceIndex: metric.schedulePerformanceIndex,
        healthStatus: metric.healthStatus
      }))
    };
  } catch (error) {
    console.error('Project EVM date range data error:', error);
    throw new Error('期間指定EVMデータの取得に失敗しました');
  }
}