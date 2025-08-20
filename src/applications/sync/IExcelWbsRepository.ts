import { ExcelWbs } from '@/domains/sync/ExcelWbs';

export interface IExcelWbsRepository {
  findByProjectId(projectId: string): Promise<ExcelWbs[]>;
  findByProjectIdSince(projectId: string): Promise<ExcelWbs[]>;
  findDeletedSince(): Promise<string[]>; // 削除されたWBS_IDのリスト
}