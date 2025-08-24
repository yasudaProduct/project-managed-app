import { ExcelWbs } from '@/domains/sync/ExcelWbs';

export interface IExcelWbsRepository {
  findByWbsName(wbsName: string): Promise<ExcelWbs[] | null>;
  findDeletedSince(): Promise<string[]>; // 削除されたWBS_IDのリスト
}