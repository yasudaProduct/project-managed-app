import type { TimelineScale } from "../gantt";
import { getTotalDays, getScaleMultiplier, getTotalColumns } from "./timelineGeometry";

/**
 * 日付がその年の第何週かを返す（ローカルタイム基準の簡易計算）。
 * 週ヘッダのラベル "W{n}" に使用する。
 */
export function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

/** 子ヘッダ（最小単位の目盛り） */
export interface ChildHeader {
  date: Date;
  label: string;
  isWeekend: boolean;
  isMainHeader: boolean;
}

/** 親ヘッダ（子を束ねる上位の目盛り） */
export interface ParentHeader {
  date: Date;
  label: string;
  /** この親が跨ぐ子カラム数 */
  span: number;
}

/** 階層表示用の親スケールを返す（なければ null） */
export function getParentScale(scale: TimelineScale): TimelineScale | null {
  switch (scale) {
    case "day":
      return "month";
    case "week":
      return "month";
    case "month":
      return "year";
    case "quarter":
      return "year";
    default:
      return null;
  }
}

/** 親ヘッダのラベルを整形する */
export function getParentLabel(date: Date, parentScale: TimelineScale): string {
  switch (parentScale) {
    case "month":
      return date.toLocaleDateString("ja-JP", { month: "short" });
    case "year":
      return date.getFullYear().toString();
    default:
      return "";
  }
}

/** start〜end をスケール単位で区切った子ヘッダ配列を生成する */
export function buildChildHeaders(
  start: Date,
  end: Date,
  scale: TimelineScale,
): ChildHeader[] {
  const headers: ChildHeader[] = [];

  const totalDays = getTotalDays(start, end);
  const totalColumns = getTotalColumns(totalDays, getScaleMultiplier(scale));
  const current = new Date(start);

  for (let i = 0; i < totalColumns; i++) {
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    switch (scale) {
      case "day":
        headers.push({
          date: new Date(current),
          label: current
            .toLocaleDateString("ja-JP", {
              month: "numeric",
              day: "numeric",
            })
            .replace(/\./g, "/"),
          isWeekend,
          isMainHeader: current.getDate() === 1,
        });
        current.setDate(current.getDate() + 1);
        break;

      case "week": {
        // Align to Monday
        const dayOfWeek = current.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(current);
        weekStart.setDate(current.getDate() - daysToMonday);

        const weekNumber = getWeekNumber(weekStart);

        headers.push({
          date: new Date(weekStart),
          label: `W${weekNumber}`,
          isWeekend: false,
          isMainHeader: weekStart.getDate() <= 7, // First week of month
        });
        current.setDate(current.getDate() + 7);
        break;
      }

      case "month":
        headers.push({
          date: new Date(current),
          label: current.toLocaleDateString("ja-JP", { month: "short" }),
          isWeekend: false,
          isMainHeader: current.getMonth() % 3 === 0, // Quarterly
        });
        // 先に日を1にしてから月を進める（29〜31日開始だと Feb 31 → Mar へ
        // ロールオーバーして月ヘッダが欠落するため順序が重要）
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
        break;

      case "quarter": {
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        headers.push({
          date: new Date(current),
          label: `Q${quarter} ${current.getFullYear()}`,
          isWeekend: false,
          isMainHeader: quarter === 1, // Yearly
        });
        // month と同様、先に日を1にしてから月を進める
        current.setDate(1);
        current.setMonth(current.getMonth() + 3);
        break;
      }
    }
  }

  return headers;
}

/** 子ヘッダ配列を親スケールで束ねた親ヘッダ配列を生成する */
export function buildParentHeaders(
  childHeaders: ChildHeader[],
  parentScale: TimelineScale,
): ParentHeader[] {
  const parentHeaders: ParentHeader[] = [];

  let currentParentDate: Date | null = null;
  let currentSpan = 0;

  childHeaders.forEach((childHeader, index) => {
    let parentDate: Date;

    switch (parentScale) {
      case "month":
        parentDate = new Date(
          childHeader.date.getFullYear(),
          childHeader.date.getMonth(),
          1,
        );
        break;
      case "year":
        parentDate = new Date(childHeader.date.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    if (
      !currentParentDate ||
      parentDate.getTime() !== currentParentDate.getTime()
    ) {
      if (currentParentDate) {
        parentHeaders.push({
          date: currentParentDate,
          label: getParentLabel(currentParentDate, parentScale),
          span: currentSpan,
        });
      }
      currentParentDate = parentDate;
      currentSpan = 1;
    } else {
      currentSpan++;
    }

    // Add the last parent header
    if (index === childHeaders.length - 1) {
      parentHeaders.push({
        date: currentParentDate,
        label: getParentLabel(currentParentDate, parentScale),
        span: currentSpan,
      });
    }
  });

  return parentHeaders;
}
