import { injectable } from 'inversify';
import { IExcelWbsRepository } from '@/applications/sync/IExcelWbsRepository';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';

@injectable()
export class ExcelWbsRepository implements IExcelWbsRepository {
  constructor() {
    // TODO: MySQL接続用のPrismaClientを初期化
    // 現在はモックデータを返す
  }

  async findByProjectId(projectId: string): Promise<ExcelWbs[]> {
    // TODO: 実際のMySQL接続を実装
    // const records = await this.mysqlPrisma.wbs.findMany({
    //   where: {
    //     PROJECT_ID: projectId,
    //   },
    // });
    // return records.map(this.mapToExcelWbs);
    
    // 現在はモックデータを返す
    return [
      {
        PROJECT_ID: projectId,
        WBS_ID: 'WBS_001',
        PHASE: 'フェーズ1',
        ACTIVITY: 'アクティビティ1',
        TASK: 'タスク1',
        TANTO: '担当者1',
        KIJUN_START_DATE: new Date('2024-01-01'),
        KIJUN_END_DATE: new Date('2024-01-31'),
        YOTEI_START_DATE: new Date('2024-01-01'),
        YOTEI_END_DATE: new Date('2024-01-31'),
        JISSEKI_START_DATE: null,
        JISSEKI_END_DATE: null,
        KIJUN_KOSU: 100,
        YOTEI_KOSU: 100,
        JISSEKI_KOSU: null,
        KIJUN_KOSU_BUFFER: 10,
        STATUS: '未着手',
        BIKO: null,
        PROGRESS_RATE: 0,
      },
    ];
  }

  async findByProjectIdSince(
    projectId: string,
    // _since: Date
  ): Promise<ExcelWbs[]> {
    // TODO: MySQLの実装では更新日時がないため、全件取得
    // 実際の実装では、更新日時カラムがある場合はそれを使用
    return this.findByProjectId(projectId);
  }

  async findDeletedSince(
    // _projectId: string,
    // _since: Date
  ): Promise<string[]> {
    // TODO: MySQLの実装では削除フラグがないため、空配列を返す
    // 実際の実装では、削除フラグカラムがある場合はそれを使用
    return [];
  }

  private mapToExcelWbs(record: Record<string, unknown>): ExcelWbs {
    return {
      PROJECT_ID: record.PROJECT_ID,
      WBS_ID: record.WBS_ID,
      PHASE: record.PHASE || '',
      ACTIVITY: record.ACTIVITY || '',
      TASK: record.TASK || '',
      TANTO: record.TANTO,
      KIJUN_START_DATE: record.KIJUN_START_DATE,
      KIJUN_END_DATE: record.KIJUN_END_DATE,
      YOTEI_START_DATE: record.YOTEI_START_DATE,
      YOTEI_END_DATE: record.YOTEI_END_DATE,
      JISSEKI_START_DATE: record.JISSEKI_START_DATE,
      JISSEKI_END_DATE: record.JISSEKI_END_DATE,
      KIJUN_KOSU: record.KIJUN_KOSU ? Number(record.KIJUN_KOSU) : null,
      YOTEI_KOSU: record.YOTEI_KOSU ? Number(record.YOTEI_KOSU) : null,
      JISSEKI_KOSU: record.JISSEKI_KOSU ? Number(record.JISSEKI_KOSU) : null,
      KIJUN_KOSU_BUFFER: record.KIJUN_KOSU_BUFFER ? Number(record.KIJUN_KOSU_BUFFER) : null,
      STATUS: record.STATUS,
      BIKO: record.BIKO,
      PROGRESS_RATE: record.PROGRESS_RATE ? Number(record.PROGRESS_RATE) : null,
    };
  }

  async disconnect(): Promise<void> {
    // TODO: await this.mysqlPrisma.$disconnect();
  }
}