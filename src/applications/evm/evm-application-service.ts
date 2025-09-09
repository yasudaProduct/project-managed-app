import { injectable, inject } from 'inversify';
import { SYMBOL } from '../../types/symbol';
import type { IEvmRepository } from './ievm-repository';
import { ProjectEvm } from '../../domains/evm/project-evm';
import { EvmMetrics } from '../../domains/evm/evm-metrics';

@injectable()
export class EvmApplicationService {
  constructor(
    @inject(SYMBOL.IEvmRepository) private evmRepository: IEvmRepository
  ) { }

  async getProjectEvmData(projectId: string): Promise<ProjectEvm | null> {
    return await this.evmRepository.getProjectEvmData(projectId);
  }

  async getProjectEvmDataByDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EvmMetrics[]> {
    return await this.evmRepository.getProjectEvmDataByDateRange(
      projectId,
      startDate,
      endDate
    );
  }

  async getAllProjectsEvmSummary(): Promise<ProjectEvm[]> {
    return await this.evmRepository.getAllProjectsEvmSummary();
  }

  async getEvmDashboardData(): Promise<{
    projects: ProjectEvm[];
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
  }> {
    const projects = await this.getAllProjectsEvmSummary();

    const healthyProjects = projects.filter(p => p.overallHealthStatus === 'healthy').length;
    const warningProjects = projects.filter(p => p.overallHealthStatus === 'warning').length;
    const criticalProjects = projects.filter(p => p.overallHealthStatus === 'critical').length;

    const totalBudget = projects.reduce((sum, p) => sum + p.budgetAtCompletion, 0);
    const totalEarnedValue = projects.reduce((sum, p) => {
      const latest = p.latestMetrics;
      return sum + (latest ? latest.ev : 0);
    }, 0);
    const totalActualCost = projects.reduce((sum, p) => {
      const latest = p.latestMetrics;
      return sum + (latest ? latest.ac : 0);
    }, 0);

    const overallCpi = totalActualCost === 0 ? 0 : totalEarnedValue / totalActualCost;
    const overallSpi = totalBudget === 0 ? 0 : totalEarnedValue / (totalBudget * 0.5); // 簡易計算

    return {
      projects,
      overallMetrics: {
        totalProjects: projects.length,
        healthyProjects,
        warningProjects,
        criticalProjects,
        totalBudget,
        totalEarnedValue,
        totalActualCost,
        overallCpi,
        overallSpi,
      },
    };
  }
}