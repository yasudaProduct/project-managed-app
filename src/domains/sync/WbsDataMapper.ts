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
    manHours: ManHour[];
  } {
    const task: Record<string, unknown> = {
      taskNo: excelWbs.WBS_ID,
      name: excelWbs.TASK || excelWbs.ACTIVITY || '',
      status: this.mapStatus(excelWbs.STATUS),
    };

    const periods = this.mapPeriods(excelWbs);
    const manHours = this.mapManHours();

    return { task, periods, manHours };
  }

  // ステータスマッピング
  private static mapStatus(excelStatus: string | null): string {
    if (!excelStatus) return 'NOT_STARTED';

    const statusMap: Record<string, string> = {
      '未着手': 'NOT_STARTED',
      '着手中': 'IN_PROGRESS',
      '進行中': 'IN_PROGRESS',
      '完了': 'COMPLETED',
      '完成': 'COMPLETED',
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
      periods.push(Period.create({
        startDate: excelWbs.YOTEI_START_DATE,
        endDate: excelWbs.YOTEI_END_DATE,
        type: new PeriodType({ type: 'YOTEI' }),
        manHours: [], // 予定日程には工数は含めない
      }));
    }

    // 実績日程
    if (excelWbs.JISSEKI_START_DATE && excelWbs.JISSEKI_END_DATE) {
      periods.push(Period.create({
        startDate: excelWbs.JISSEKI_START_DATE,
        endDate: excelWbs.JISSEKI_END_DATE,
        type: new PeriodType({ type: 'JISSEKI' }),
        manHours: [], // 実績日程には工数は含めない
      }));
    }

    return periods;
  }

  // 工数マッピング（独立した工数は期間に含まれるため空配列を返す）
  private static mapManHours(): ManHour[] {
    // 工数は期間モデル内で管理されるため、ここでは空配列を返す
    return [];
  }

  // 削除判定
  static getDeletedWbsIds(
    excelData: ExcelWbs[],
    appTasks: Task[]
  ): string[] {
    const excelWbsIds = new Set(excelData.map(e => e.WBS_ID));
    return appTasks
      .filter(task => task.taskNo && !excelWbsIds.has(task.taskNo.getValue()))
      .map(task => task.taskNo.getValue());
  }

  // 更新判定
  static needsUpdate(excelWbs: ExcelWbs, appTask: Task): boolean {
    // タスク名の変更チェック
    const excelTaskName = excelWbs.TASK || excelWbs.ACTIVITY || '';
    if (appTask.name !== excelTaskName) return true;

    // ステータスの変更チェック
    const mappedStatus = this.mapStatus(excelWbs.STATUS);
    if (appTask.getStatus() !== mappedStatus) return true;

    // TODO: 期間や工数の変更もチェックする必要がある場合は追加

    return false;
  }
}