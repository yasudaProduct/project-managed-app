import { injectable } from 'inversify';
import { IExcelWbsRepository } from '@/applications/excel-sync/IExcelWbsRepository';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import { geppoPrisma } from '@/lib/prisma/geppo';
import { wbs } from '.prisma/geppo-client'
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

  async findByWbsName(wbsName: string): Promise<ExcelWbs[] | null> {
    const excelWbs = await geppoPrisma.wbs.findMany({
      where: {
        PROJECT_ID: wbsName,
      },
    });
    if (!excelWbs) return null;
    return excelWbs.map(this.mapToExcelWbs);
  }

  private mapToExcelWbs(record: wbs): ExcelWbs {
    return {
      PROJECT_ID: record.PROJECT_ID as string,
      WBS_ID: record.WBS_ID as string,
      PHASE: record.PHASE as string,
      ACTIVITY: record.ACTIVITY as string,
      TASK: record.TASK as string,
      TANTO: record.TANTO as string | null,
      KIJUN_START_DATE: record.KIJUN_START_DATE as Date | null,
      KIJUN_END_DATE: record.KIJUN_END_DATE as Date | null,
      YOTEI_START_DATE: record.YOTEI_START_DATE as Date | null,
      YOTEI_END_DATE: record.YOTEI_END_DATE as Date | null,
      JISSEKI_START_DATE: record.JISSEKI_START_DATE as Date | null,
      JISSEKI_END_DATE: record.JISSEKI_END_DATE as Date | null,
      KIJUN_KOSU: record.KIJUN_KOSU ? Number(record.KIJUN_KOSU) : null,
      YOTEI_KOSU: record.YOTEI_KOSU ? Number(record.YOTEI_KOSU) : null,
      JISSEKI_KOSU: record.JISSEKI_KOSU ? Number(record.JISSEKI_KOSU) : null,
      KIJUN_KOSU_BUFFER: record.KIJUN_KOSU_BUFFER ? Number(record.KIJUN_KOSU_BUFFER) : null,
      STATUS: record.STATUS as string,
      BIKO: record.BIKO as string | null,
      PROGRESS_RATE: record.PROGRESS_RATE as number | null,
    };
  }

  async disconnect(): Promise<void> {
    // TODO: await this.mysqlPrisma.$disconnect();
  }
}