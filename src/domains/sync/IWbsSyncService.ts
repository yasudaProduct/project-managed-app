import { ExcelWbs, SyncChanges, SyncResult } from './ExcelWbs';
import { Task } from '@/domains/task/task';

export interface IWbsSyncService {
  // Excel側データ取得
  fetchExcelData(projectId: string): Promise<ExcelWbs[]>;
  
  // 変更検出
  detectChanges(
    excelData: ExcelWbs[],
    appData: Task[]
  ): Promise<SyncChanges>;
  
  // 変更適用
  applyChanges(changes: SyncChanges): Promise<SyncResult>;
}