import { ExcelWbs } from '@/domains/sync/excel-wbs';

export interface IExcelWbsRepository {
  findByWbsName(wbsName: string): Promise<ExcelWbs[] | null>;
  findDeletedSince(): Promise<string[]>; // 削除されたWBS_IDのリスト
}