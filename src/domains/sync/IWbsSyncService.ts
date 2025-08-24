import { ExcelWbs, SyncChanges, SyncResult, ValidationError } from './ExcelWbs';
import { Task } from '@/domains/task/task';
import { Phase } from '@/domains/phase/phase';
import { User } from '@/domains/user/user';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';

export interface PreviewResult {
  changes: SyncChanges;
  validationErrors: ValidationError[];
  newPhases: Phase[];
  newUsers: User[];
  newAssignees: WbsAssignee[];
}

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
  
  // プレビュー（ドメイン制約チェック付き）
  previewChanges(wbsId: number, wbsName: string): Promise<PreviewResult>;
  
  // 洗い替え（全削除→全インポート）
  replaceAll(wbsId: number, wbsName: string): Promise<SyncResult>;
}