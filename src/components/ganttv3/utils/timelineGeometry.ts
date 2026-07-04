import type { TimelineScale } from "../gantt";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * scale ごとの「1カラムが表す日数」。
 * day=1, week=7, month=30(近似), quarter=90(近似), それ以外(year等)=90。
 *
 * 注: 旧 TimelineHeader は default を 7 としていたが、X座標の基準である
 * GanttChart 側(90)に統一する。day/week/month/quarter の結果は両者で不変。
 */
export function getScaleMultiplier(scale: TimelineScale): number {
  switch (scale) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      return 90;
  }
}

/** start〜end の総日数（切り上げ） */
export function getTotalDays(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/** 総日数とスケールからカラム数（切り上げ）を求める */
export function getTotalColumns(
  totalDays: number,
  scaleMultiplier: number,
): number {
  return Math.ceil(totalDays / scaleMultiplier);
}

/**
 * 日付を timeline 開始からの X 座標(px)へ変換する。
 * （カラム単位ではなく日数比に基づく連続値。バー位置の算出に使う）
 */
export function dateToX(
  date: Date,
  start: Date,
  scaleMultiplier: number,
  columnWidth: number,
): number {
  const daysDiff = (date.getTime() - start.getTime()) / MS_PER_DAY;
  return (daysDiff / scaleMultiplier) * columnWidth;
}

/** チャート全幅(px)。最小幅でクランプする */
export function getChartWidth(
  totalDays: number,
  scaleMultiplier: number,
  columnWidth: number,
  minWidth = 1200,
): number {
  return Math.max((totalDays / scaleMultiplier) * columnWidth, minWidth);
}
