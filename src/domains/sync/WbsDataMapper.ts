import { ExcelWbs } from './ExcelWbs';
import { Task } from '@/domains/task/task';
import { Period } from '@/domains/task/period';
import { ManHour } from '@/domains/task/man-hour';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';

/**
 * Excelデータをドメインモデルに変換する
 */
export class WbsDataMapper {
  // Excel → App変換
  static toAppWbs(excelWbs: ExcelWbs): {
    task: Record<string, unknown>;
    periods: Period[];
  } {
    // TODO: taskをドメインモデルに変換するのはbuildTaskDomainFromExcelで行っているが、ここでやればいいのでは？
    const task: Record<string, unknown> = {
      taskNo: excelWbs.WBS_ID || undefined,
      name: (excelWbs.ACTIVITY + excelWbs.TASK) || undefined, // TODO: TASKとACTIVITYの運用を理解して、どちらを使うか決める
      status: this.mapStatus(excelWbs.STATUS),
    };

    const periods = this.mapPeriods(excelWbs);

    return { task, periods };
  }

  // ステータスマッピング
  private static mapStatus(excelStatus: string | null): string {
    if (!excelStatus) return 'NOT_STARTED';

    const statusMap: Record<string, string> = {
      '未着手': 'NOT_STARTED',
      '着手中': 'IN_PROGRESS',
      '完了': 'COMPLETED',
    };

    return statusMap[excelStatus] || 'NOT_STARTED';
  }

  // 期間マッピング
  private static mapPeriods(excelWbs: ExcelWbs): Period[] {
    const periods: Period[] = [];

    // 基準日程
    if (excelWbs.KIJUN_START_DATE && excelWbs.KIJUN_END_DATE) {
      const kijunManHours: ManHour[] = [];
      if (excelWbs.KIJUN_KOSU !== null) {
        kijunManHours.push(ManHour.create({
          kosu: excelWbs.KIJUN_KOSU,
          type: new ManHourType({ type: 'NORMAL' })
        }));
      }
      if (excelWbs.KIJUN_KOSU_BUFFER !== null) {
        kijunManHours.push(ManHour.create({
          kosu: excelWbs.KIJUN_KOSU_BUFFER,
          type: new ManHourType({ type: 'RISK' })
        }));
      }

      periods.push(Period.create({
        startDate: excelWbs.KIJUN_START_DATE,
        endDate: excelWbs.KIJUN_END_DATE,
        type: new PeriodType({ type: 'KIJUN' }),
        manHours: kijunManHours,
      }));
    }

    // 予定日程
    if (excelWbs.YOTEI_START_DATE && excelWbs.YOTEI_END_DATE) {
      const yoteiManHours: ManHour[] = [];
      if (excelWbs.YOTEI_KOSU !== null) {
        yoteiManHours.push(ManHour.create({
          kosu: excelWbs.YOTEI_KOSU,
          type: new ManHourType({ type: 'NORMAL' })
        }));
      }
      periods.push(Period.create({
        startDate: excelWbs.YOTEI_START_DATE,
        endDate: excelWbs.YOTEI_END_DATE,
        type: new PeriodType({ type: 'YOTEI' }),
        manHours: yoteiManHours,
      }));
    }

    return periods;
  }

  // 工数マッピング（独立した工数は期間に含まれるため空配列を返す）
  private static mapManHours(): ManHour[] {
    // 工数は期間モデル内で管理されるため、ここでは空配列を返す
    return [];
  }

}