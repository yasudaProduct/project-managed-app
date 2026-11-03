import type { SteadyPlanUnit } from "@/types/steady-work-plan";

const INVALID_HOURS = "定常枠の時間は0以上の数値で指定してください";
const INVALID_PERIOD = "定常枠の開始日は終了日以前にしてください";
const OVERLAPPING = "定常枠の有効期間が重なっています";

/** 日付をローカルの YYYY-MM-DD に揃える（カレンダー系ドメインと同じ比較規約） */
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 定常枠（Steady Work Plan）
 * @description
 * 常設プロジェクトの定常タスクについて、担当者が使う予定量を
 * 「1営業日あたり」または「1か月あたり」の時間と有効期間で表す。
 * 「完了」概念を持たず、同じタスクの枠は有効期間が重ならない。
 */
export class SteadyWorkPlan {
  public readonly id?: number;
  public readonly taskId: number;
  public readonly unit: SteadyPlanUnit;
  public readonly hours: number;
  public readonly validFrom: Date;
  /** 終了日（含む）。未指定は無期限 */
  public readonly validTo?: Date;

  private constructor(args: {
    id?: number;
    taskId: number;
    unit: SteadyPlanUnit;
    hours: number;
    validFrom: Date;
    validTo?: Date;
  }) {
    if (!Number.isFinite(args.hours) || args.hours < 0) {
      throw new Error(INVALID_HOURS);
    }
    if (args.validTo && toYmd(args.validFrom) > toYmd(args.validTo)) {
      throw new Error(INVALID_PERIOD);
    }
    this.id = args.id;
    this.taskId = args.taskId;
    this.unit = args.unit;
    this.hours = args.hours;
    this.validFrom = args.validFrom;
    this.validTo = args.validTo;
  }

  public static create(args: {
    taskId: number;
    unit: SteadyPlanUnit;
    hours: number;
    validFrom: Date;
    validTo?: Date;
  }): SteadyWorkPlan {
    return new SteadyWorkPlan(args);
  }

  public static createFromDb(args: {
    id: number;
    taskId: number;
    unit: SteadyPlanUnit;
    hours: number;
    validFrom: Date;
    validTo?: Date;
  }): SteadyWorkPlan {
    return new SteadyWorkPlan(args);
  }

  /** 指定日（日付単位、両端含む）に有効か */
  public isActiveOn(date: Date): boolean {
    const target = toYmd(date);
    if (target < toYmd(this.validFrom)) return false;
    if (this.validTo && target > toYmd(this.validTo)) return false;
    return true;
  }

  /** 有効期間が重なるか（両端含む。無期限は無限遠まで続くとみなす） */
  public overlapsWith(other: SteadyWorkPlan): boolean {
    const thisEnd = this.validTo ? toYmd(this.validTo) : undefined;
    const otherEnd = other.validTo ? toYmd(other.validTo) : undefined;
    const startsBeforeOtherEnds = otherEnd === undefined || toYmd(this.validFrom) <= otherEnd;
    const otherStartsBeforeThisEnds = thisEnd === undefined || toYmd(other.validFrom) <= thisEnd;
    return startsBeforeOtherEnds && otherStartsBeforeThisEnds;
  }

  /** 枠同士の有効期間が重なっていれば例外を投げる */
  public static assertNoOverlap(plans: ReadonlyArray<SteadyWorkPlan>): void {
    for (let i = 0; i < plans.length; i++) {
      for (let j = i + 1; j < plans.length; j++) {
        if (plans[i].overlapsWith(plans[j])) {
          throw new Error(OVERLAPPING);
        }
      }
    }
  }
}
