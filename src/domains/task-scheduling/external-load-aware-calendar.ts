import { type WorkingCalendar, toDateKey } from "./working-calendar-walker";

/**
 * 他WBS(外部)負荷を考慮した稼働カレンダー。
 * @description
 * 参画率を「そのWBSに割ける取り分の予約」と解釈し、外部負荷はまず参画率外の
 * 時間から消費されるものとして日次の稼働可能時間を算出する:
 *
 *   available = max(0, min(標準×参画率, 物理残(標準−個人予定) − 外部負荷))
 *
 * 参画率キャップ後の枠から外部負荷を引く方式(min(物理残, 標準×率) − 外部)だと、
 * 例えば0.5/0.5で2プロジェクトを掛け持ちする担当者の取り分が不当に0になるため、
 * この方式を採用する。参画率1.0の担当者では両方式は一致する。
 */
export class ExternalLoadAwareCalendar implements WorkingCalendar {
  /** rate=1相当の物理カレンダー(標準勤務時間−個人予定。非稼働日は0) */
  private readonly physicalCalendar: WorkingCalendar;
  /** 取り分の上限(標準勤務時間×参画率) */
  private readonly rateCapHours: number;
  /** 外部(他WBS)負荷 dateKey('YYYY-MM-DD') → hours */
  private readonly externalDailyHours: Map<string, number>;

  constructor(args: {
    physicalCalendar: WorkingCalendar;
    rateCapHours: number;
    externalDailyHours: Map<string, number>;
  }) {
    this.physicalCalendar = args.physicalCalendar;
    this.rateCapHours = args.rateCapHours;
    this.externalDailyHours = args.externalDailyHours;
  }

  getAvailableHours(date: Date): number {
    const physical = this.physicalCalendar.getAvailableHours(date);
    if (physical <= 0) return 0;

    const external = this.externalDailyHours.get(toDateKey(date)) ?? 0;
    const remaining = physical - external;
    if (remaining <= 0) return 0;

    return Math.min(this.rateCapHours, remaining);
  }
}
