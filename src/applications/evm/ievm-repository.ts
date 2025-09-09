import { ProjectEvm } from '../../domains/evm/project-evm';
import { EvmMetrics } from '../../domains/evm/evm-metrics';

export interface IEvmRepository {
  getProjectEvmData(projectId: string): Promise<ProjectEvm | null>;
  getProjectEvmDataByDateRange(
    projectId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<EvmMetrics[]>;
  getAllProjectsEvmSummary(): Promise<ProjectEvm[]>;
}