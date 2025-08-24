import { injectable } from 'inversify';
import { IExcelWbsRepository } from '@/applications/excel-sync/IExcelWbsRepository';
import { ExcelWbs } from '@/domains/sync/ExcelWbs';
import { geppoPrisma } from '@/lib/prisma/geppo';
import { wbs } from '.prisma/geppo-client'
@injectable()
export class ExcelWbsRepository implements IExcelWbsRepository {

  async findDeletedSince(
  ): Promise<string[]> {
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
      ROW_NO: record.ROW_NO as number,
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