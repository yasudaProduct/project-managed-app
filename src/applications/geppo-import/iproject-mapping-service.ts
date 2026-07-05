import { Geppo } from '@/domains/geppo/types';
import { ProjectImportOption, ProjectMappingValidation } from '@/domains/geppo-import/geppo-import-result';

export interface IProjectMappingService {
  createProjectMap(geppoProjectIds: string[]): Promise<Map<string, string>>;
  filterGeppoByTargetProjects(geppoRecords: Geppo[], targetProjectNames?: string[]): Promise<Geppo[]>;
  getAvailableProjectsForImport(targetMonth: string): Promise<ProjectImportOption[]>;
  validateProjectMapping(geppoRecords: Geppo[]): Promise<ProjectMappingValidation>;
}
