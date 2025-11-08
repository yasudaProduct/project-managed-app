import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "./get-wbs-summary-query";
import { WbsSummaryResult, PhaseSummary, AssigneeSummary, MonthlyAssigneeData, TaskAllocationDetail } from "./wbs-summary-result";
import { AllocationCalculationMode } from "./allocation-calculation-mode";
import { SYMBOL } from "@/types/symbol";
import { WbsTaskData, PhaseData } from "@/applications/wbs/query/wbs-query-repository";
import type { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation.service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import { BusinessDayPeriod } from "@/domains/calendar/business-day-period";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import prisma from "@/lib/prisma/prisma";

@injectable()
export class GetWbsSummaryHandler implements IQueryHandler<GetWbsSummaryQuery, WbsSummaryResult> {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private readonly wbsQueryRepository: IWbsQueryRepository,
    @inject(SYMBOL.ICompanyHolidayRepository)
    private readonly companyHolidayRepository: ICompanyHolidayRepository,
    @inject(SYMBOL.IUserScheduleRepository)
    private readonly userScheduleRepository: IUserScheduleRepository,
    @inject(SYMBOL.IWbsAssigneeRepository)
    private readonly wbsAssigneeRepository: IWbsAssigneeRepository
  ) { }

  async execute(query: GetWbsSummaryQuery): Promise<WbsSummaryResult> {
    // WBSタスクを取得
    const tasks = await this.wbsQueryRepository.getWbsTasks(query.projectId, query.wbsId);

    // 工程リストを取得
    const phases = await this.wbsQueryRepository.getPhases(query.wbsId);

    // 工程別集計
    const phaseSummaries = this.calculatePhaseSummary(tasks, phases);

    const phaseTotal = this.calculateTotal(phaseSummaries);

    // 担当者別集計
    const assigneeSummaries = this.calculateAssigneeSummary(tasks);
    const assigneeTotal = this.calculateTotal(assigneeSummaries);

    // 設定取得（0.25単位量子化フラグ）
    const settings = await prisma.projectSettings.findUnique({ where: { projectId: query.projectId } });
    const roundToQuarter = settings?.roundToQuarter === true;

    // 月別・担当者別集計
    const monthlyAssigneeSummary = await this.calculateMonthlyAssigneeSummary(tasks, query.wbsId, query.calculationMode, roundToQuarter);

    return {
      phaseSummaries,
      phaseTotal,
      assigneeSummaries,
      assigneeTotal,
      monthlyAssigneeSummary,
    };
  }

  /**
   * 工程別集計
   * @param tasks タスクデータ
   * @param phases 工程データ
   * @returns 工程別集計
   * 
   * @description
   * 工程別集計を行う
   * 工程別集計は、工程ごとにタスク数、予定工数、実績工数、差分を計算する
   */
  private calculatePhaseSummary(tasks: WbsTaskData[], phases: PhaseData[]): PhaseSummary[] {
    const summaryMap = new Map<string, PhaseSummary>();

    // 初期化
    phases.forEach(phase => {
      summaryMap.set(phase.name, {
        phase: phase.name,
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      });
    });

    // タスクを集計
    tasks.forEach(task => {
      const phaseName = task.phase?.name || (typeof task.phase === "string" ? task.phase : null);
      if (phaseName && summaryMap.has(phaseName)) {
        const summary = summaryMap.get(phaseName)!;
        summary.taskCount += 1;
        summary.plannedHours += Number(task.yoteiKosu || 0);
        summary.actualHours += Number(task.jissekiKosu || 0);
        summary.difference = summary.actualHours - summary.plannedHours;
      }
    });

    return Array.from(summaryMap.values());
  }

  /**
   * 担当者別集計
   * @param tasks タスクデータ
   * @returns 担当者別集計
   * 
   * @description
   * 担当者ごとにタスク数、予定工数、実績工数、差分を計算する
   */
  private calculateAssigneeSummary(tasks: WbsTaskData[]): AssigneeSummary[] {
    const summaryMap = new Map<string, AssigneeSummary>();

    tasks.forEach(task => {
      const key = task.assignee ? task.assignee.displayName : '未割当';
      const existing = summaryMap.get(key) || {
        assignee: key,
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      existing.taskCount += 1;
      existing.plannedHours += Number(task.yoteiKosu || 0);
      existing.actualHours += Number(task.jissekiKosu || 0);
      existing.difference = existing.actualHours - existing.plannedHours;

      summaryMap.set(key, existing);
    });

    return Array.from(summaryMap.values());
  }

  /**
   * 月別・担当者別集計
   * @param tasks 
   * @param wbsId 
   * @param calculationMode 
   * @description
   * 月別・担当者別集計を行う
   * 月別・担当者別集計は、月ごとにタスク数、予定工数、実績工数、差分を計算する
   */
  private async calculateMonthlyAssigneeSummary(tasks: WbsTaskData[], wbsId: number, calculationMode: AllocationCalculationMode, roundToQuarter: boolean) {
    switch (calculationMode) {
      case AllocationCalculationMode.BUSINESS_DAY_ALLOCATION:
        return this.calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(tasks, wbsId, roundToQuarter);
      case AllocationCalculationMode.START_DATE_BASED:
        return this.calculateMonthlyAssigneeSummaryWithStartDateBased(tasks);
      default:
        throw new Error(`Unknown calculation mode: ${calculationMode}`);
    }
  }

  /**
   * 営業日案分による月別・担当者別集計
   * @description
   * 
   */
  private async calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(tasks: WbsTaskData[], wbsId: number, roundToQuarter: boolean) {
    const monthlyData: MonthlyAssigneeData[] = []; // 月別・担当者別集計データの配列
    const assignees = new Set<string>(); // 担当者名リスト (未割当の場合は'未割当'を返す)
    const months = new Set<string>(); // 月リスト (年月の集合)
    const dataMap = new Map<string, MonthlyAssigneeData>(); // 月別・担当者別集計データのマップ (キー: yearMonth-assignee)
    const taskDetailsMap = new Map<string, TaskAllocationDetail[]>(); // タスク詳細のマップ (キー: yearMonth-assignee)

    // 会社休日とWorking Hours Allocation Serviceの準備
    const companyHolidays = await this.companyHolidayRepository.findAll();
    const companyCalendar = new CompanyCalendar(companyHolidays);
    const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);

    // WBS担当者情報(WbsAssigneeモデル)を取得
    const wbsAssignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
    const assigneeMap = new Map(wbsAssignees.map(a => [a.userId, a]));

    // タスクごとに営業日案分を適用
    for (const task of tasks) {
      // 予定開始日がない場合はスキップ（集計月を決定できないため）
      if (!task.yoteiStart) continue;

      // 担当者名を取得 (未割当の場合は'未割当'を返す)
      const assigneeName = task.assignee?.displayName ?? '未割当';
      assignees.add(assigneeName);

      // 担当者のWbsAssigneeを取得（担当者未割当またはWbsAssignee未登録時は開始日基準で集計）
      const wbsAssignee = task.assignee ? assigneeMap.get(task.assignee.id.toString()) : undefined;
      if (!wbsAssignee) {
        // 担当者未割当 or WbsAssignee未登録 の場合
        const hasEnd = !!task.yoteiEnd; // 予定終了日があるかどうか
        const isSameMonthForUnassigned = !hasEnd || this.isSameMonth(task.yoteiStart, task.yoteiEnd!); // 予定開始日と予定終了日が同じ月かどうか

        if (isSameMonthForUnassigned) { // 予定開始日と予定終了日が同じ月の場合
          // 単月: 開始日基準でその月に全て計上
          const date = new Date(task.yoteiStart);
          const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`; // 年月 (YYYY/MM)
          months.add(yearMonth);

          const key = `${yearMonth}-${assigneeName}`; // キー (yearMonth-assigneeName)
          const existing = dataMap.get(key) || { // 月別・担当者別集計データのマップ (キー: yearMonth-assignee) 存在しない場合は新規作成
            assignee: assigneeName, // 担当者名
            month: yearMonth, // 月 (YYYY/MM)
            taskCount: 0, // タスク数
            plannedHours: 0, // 予定工数
            actualHours: 0, // 実績工数
            difference: 0, // 差分
            taskDetails: [], // タスク詳細
          };

          existing.taskCount += 1; // タスク数を1増やす
          existing.plannedHours += Number(task.yoteiKosu || 0); // 予定工数を追加
          existing.actualHours += Number(task.jissekiKosu || 0); // 実績工数を追加
          existing.difference = existing.actualHours - existing.plannedHours; // 差分を計算 (実績工数 - 予定工数)

          // タスク詳細を追加
          if (!taskDetailsMap.has(key)) { // タスク詳細のマップ (キー: yearMonth-assignee) 存在しない場合は新規作成
            taskDetailsMap.set(key, []); // タスク詳細を空配列で初期化
          }

          // 予定終了日がある場合は予定終了日、ない場合は予定開始日
          const endDate = task.yoteiEnd ? new Date(task.yoteiEnd) : date;

          // タスク詳細を作成
          const taskDetail: TaskAllocationDetail = {
            taskId: task.id, // タスクID
            taskName: task.name, // タスク名
            phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
            assignee: assigneeName, // 担当者名
            startDate: date.toISOString().split('T')[0], // 予定開始日
            endDate: endDate.toISOString().split('T')[0], // 予定終了日
            totalPlannedHours: Number(task.yoteiKosu || 0), // 予定工数
            totalActualHours: Number(task.jissekiKosu || 0), // 実績工数
            monthlyAllocations: [{ // 月別按分詳細
              month: yearMonth, // 月 (YYYY/MM)
              workingDays: 1, // 営業日数
              availableHours: 7.5, // 利用可能時間
              allocatedPlannedHours: Number(task.yoteiKosu || 0), // 配分予定工数
              allocatedActualHours: Number(task.jissekiKosu || 0), // 配分実績工数
              allocationRatio: 1.0 // 配分比率
            }]
          };
          taskDetailsMap.get(key)!.push(taskDetail);

          dataMap.set(key, existing); // 月別・担当者別集計データのマップ (キー: yearMonth-assignee) に追加
          continue; // 次のタスクに進む
        }

        // 複数月: 会社カレンダーのみ考慮して営業日比率で案分
        const startDate = new Date(task.yoteiStart); // 予定開始日
        const endDate = new Date(task.yoteiEnd!); // 予定終了日
        const fallbackAssignee = WbsAssignee.create({ wbsId, userId: 'unassigned', rate: 1, seq: 0 }); // 担当者未割当なので、仮の担当者を作成

        // BusinessDayPeriodを作成
        const period = new BusinessDayPeriod(
          startDate, // 予定開始日
          endDate, // 予定終了日
          fallbackAssignee, // 仮の担当者
          companyCalendar, // 会社カレンダー
          [] // 個人スケジュール
        );

        // 営業日案分を実行 allocatedHoursRaw: 月別按分詳細<string, number> (月: 按分工数)
        const allocatedHoursRaw = workingHoursAllocationService.allocateTaskHoursByAssigneeWorkingDays(
          {
            yoteiStart: startDate,
            yoteiEnd: endDate,
            yoteiKosu: Number(task.yoteiKosu || 0)
          },
          fallbackAssignee,
          []
        );

        // 0.25単位量子化（予定工数のみ）
        const allocatedHours = roundToQuarter
          ? this.quantizeAllocatedHours(allocatedHoursRaw)
          : allocatedHoursRaw;

        const businessDaysByMonth = period.getBusinessDaysByMonth(); // 月別営業日数
        const availableHoursByMonth = period.getAvailableHoursByMonth(); // 月別稼働可能時間
        const totalAvailableHours = Array.from(availableHoursByMonth.values()).reduce((sum, hours) => sum + hours, 0); // 総稼働可能時間を集計

        const taskDetail: TaskAllocationDetail = {
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
          assignee: assigneeName,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalPlannedHours: Number(task.yoteiKosu || 0),
          totalActualHours: Number(task.jissekiKosu || 0),
          monthlyAllocations: []
        };

        allocatedHours.forEach((hours, yearMonth) => {
          months.add(yearMonth);

          const key = `${yearMonth}-${assigneeName}`;
          const existing = dataMap.get(key) || {
            assignee: assigneeName,
            month: yearMonth,
            taskCount: 0,
            plannedHours: 0,
            actualHours: 0,
            difference: 0,
            taskDetails: [],
          };

          existing.taskCount += 1;
          existing.plannedHours += hours;
          if (this.formatYearMonth(startDate) === yearMonth) {
            existing.actualHours += Number(task.jissekiKosu || 0);
          }
          existing.difference = existing.actualHours - existing.plannedHours;

          const workingDays = businessDaysByMonth.get(yearMonth) || 0;
          const availableHours = availableHoursByMonth.get(yearMonth) || 0;
          const allocationRatio = totalAvailableHours > 0 ? availableHours / totalAvailableHours : 0;

          taskDetail.monthlyAllocations.push({
            month: yearMonth,
            workingDays: workingDays,
            availableHours: availableHours,
            allocatedPlannedHours: hours,
            allocatedActualHours: this.formatYearMonth(startDate) === yearMonth ? Number(task.jissekiKosu || 0) : 0,
            allocationRatio: allocationRatio
          });

          if (!taskDetailsMap.has(key)) {
            taskDetailsMap.set(key, []);
          }
          dataMap.set(key, existing);
        });

        allocatedHours.forEach((_, yearMonth) => {
          const key = `${yearMonth}-${assigneeName}`;
          if (!taskDetailsMap.has(key)) {
            taskDetailsMap.set(key, []);
          }
          taskDetailsMap.get(key)!.push(taskDetail);
        });

        continue; // 次のタスクに進む
      }

      // 月をまたぐかチェック
      const isSameMonth = !task.yoteiEnd || this.isSameMonth(task.yoteiStart, task.yoteiEnd);

      if (isSameMonth) {
        // 単月の場合は開始日基準ロジック
        const date = new Date(task.yoteiStart);
        const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(yearMonth);

        const key = `${yearMonth}-${assigneeName}`;
        const existing = dataMap.get(key) || {
          assignee: assigneeName,
          month: yearMonth,
          taskCount: 0,
          plannedHours: 0,
          actualHours: 0,
          difference: 0,
          taskDetails: [],
        };

        existing.taskCount += 1;
        existing.plannedHours += Number(task.yoteiKosu || 0);
        existing.actualHours += Number(task.jissekiKosu || 0);
        existing.difference = existing.actualHours - existing.plannedHours;

        // タスク詳細を追加（単月タスク）
        if (!taskDetailsMap.has(key)) {
          taskDetailsMap.set(key, []);
        }
        const taskDetail: TaskAllocationDetail = {
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
          assignee: assigneeName,
          startDate: task.yoteiStart.toISOString().split('T')[0],
          endDate: task.yoteiStart.toISOString().split('T')[0],
          totalPlannedHours: Number(task.yoteiKosu || 0),
          totalActualHours: Number(task.jissekiKosu || 0),
          monthlyAllocations: [{
            month: yearMonth,
            workingDays: 1,
            availableHours: 7.5,
            allocatedPlannedHours: Number(task.yoteiKosu || 0),
            allocatedActualHours: Number(task.jissekiKosu || 0),
            allocationRatio: 1.0
          }]
        };
        taskDetailsMap.get(key)!.push(taskDetail);

        dataMap.set(key, existing);
      } else {
        // 月をまたぐ場合は営業日案分
        const startDate = new Date(task.yoteiStart);
        const endDate = new Date(task.yoteiEnd!);

        // ユーザースケジュールを取得
        const userSchedules = await this.userScheduleRepository.findByUserIdAndDateRange(
          wbsAssignee.userId,
          startDate,
          endDate
        );

        // BusinessDayPeriodを作成して詳細情報を取得
        const period = new BusinessDayPeriod(
          startDate,
          endDate,
          wbsAssignee,
          companyCalendar,
          userSchedules
        );

        // 営業日案分を実行
        const allocatedHoursRaw = workingHoursAllocationService.allocateTaskHoursByAssigneeWorkingDays(
          {
            yoteiStart: startDate,
            yoteiEnd: endDate,
            yoteiKosu: Number(task.yoteiKosu || 0)
          },
          wbsAssignee,
          userSchedules
        );

        // 0.25単位量子化（予定工数のみ）
        const allocatedHours = roundToQuarter
          ? this.quantizeAllocatedHours(allocatedHoursRaw)
          : allocatedHoursRaw;

        // 月別の営業日数と利用可能時間を取得
        const businessDaysByMonth = period.getBusinessDaysByMonth();
        const availableHoursByMonth = period.getAvailableHoursByMonth();
        const totalAvailableHours = Array.from(availableHoursByMonth.values()).reduce((sum, hours) => sum + hours, 0);

        // タスク詳細情報を作成
        const taskDetail: TaskAllocationDetail = {
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
          assignee: assigneeName,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalPlannedHours: Number(task.yoteiKosu || 0),
          totalActualHours: Number(task.jissekiKosu || 0),
          monthlyAllocations: []
        };

        // 案分結果を月別データに追加
        allocatedHours.forEach((hours, yearMonth) => {
          months.add(yearMonth);

          const key = `${yearMonth}-${assigneeName}`;
          const existing = dataMap.get(key) || {
            assignee: assigneeName,
            month: yearMonth,
            taskCount: 0,
            plannedHours: 0,
            actualHours: 0,
            difference: 0,
            taskDetails: [],
          };

          existing.taskCount += 1;
          existing.plannedHours += hours;
          // 実績工数は開始月に計上
          if (this.formatYearMonth(startDate) === yearMonth) {
            existing.actualHours += Number(task.jissekiKosu || 0);
          }
          existing.difference = existing.actualHours - existing.plannedHours;

          // 月別案分詳細を追加
          const workingDays = businessDaysByMonth.get(yearMonth) || 0;
          const availableHours = availableHoursByMonth.get(yearMonth) || 0;
          const allocationRatio = totalAvailableHours > 0 ? availableHours / totalAvailableHours : 0;

          taskDetail.monthlyAllocations.push({
            month: yearMonth,
            workingDays: workingDays,
            availableHours: availableHours,
            allocatedPlannedHours: hours,
            allocatedActualHours: this.formatYearMonth(startDate) === yearMonth ? Number(task.jissekiKosu || 0) : 0,
            allocationRatio: allocationRatio
          });

          // タスク詳細を記録
          if (!taskDetailsMap.has(key)) {
            taskDetailsMap.set(key, []);
          }

          dataMap.set(key, existing);
        });

        // タスク詳細を各月のキーに追加
        allocatedHours.forEach((hours, yearMonth) => {
          const key = `${yearMonth}-${assigneeName}`;
          if (!taskDetailsMap.has(key)) {
            taskDetailsMap.set(key, []);
          }
          taskDetailsMap.get(key)!.push(taskDetail);
        });
      }
    }

    // monthlyDataにタスク詳細を含める
    for (const [key, data] of dataMap) {
      const taskDetails = taskDetailsMap.get(key) || [];
      monthlyData.push({
        ...data,
        taskDetails: taskDetails
      });
    }

    const sortedMonths = Array.from(months).sort();
    const sortedAssignees = Array.from(assignees).sort();

    // 月別合計
    const monthlyTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};
    sortedMonths.forEach(month => {
      monthlyTotals[month] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      monthlyData
        .filter(data => data.month === month)
        .forEach(data => {
          monthlyTotals[month].taskCount += data.taskCount;
          monthlyTotals[month].plannedHours += data.plannedHours;
          monthlyTotals[month].actualHours += data.actualHours;
          monthlyTotals[month].difference += data.difference;
        });
    });

    // 担当者別合計
    const assigneeTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};
    sortedAssignees.forEach(assignee => {
      assigneeTotals[assignee] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      monthlyData
        .filter(data => data.assignee === assignee)
        .forEach(data => {
          assigneeTotals[assignee].taskCount += data.taskCount;
          assigneeTotals[assignee].plannedHours += data.plannedHours;
          assigneeTotals[assignee].actualHours += data.actualHours;
          assigneeTotals[assignee].difference += data.difference;
        });
    });

    // 全体合計
    const grandTotal = {
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
    };

    Object.values(assigneeTotals).forEach(total => {
      grandTotal.taskCount += total.taskCount;
      grandTotal.plannedHours += total.plannedHours;
      grandTotal.actualHours += total.actualHours;
      grandTotal.difference += total.difference;
    });

    return {
      data: monthlyData,
      months: sortedMonths,
      assignees: sortedAssignees,
      monthlyTotals,
      assigneeTotals,
      grandTotal,
    };
  }

  /**
   * 集計データ（工程別・担当者別）の配列から、全体の合計値を算出するメソッド
   * 
   * @param summaries - PhaseSummary または AssigneeSummary の配列
   * @returns 合計値
   * {
   *   taskCount: number; タスク数
   *   plannedHours: number; 予定工数
   *   actualHours: number; 実績工数
   *   difference: number; 差分
   * }
  */
  private calculateTotal(summaries: Array<PhaseSummary | AssigneeSummary>) {
    return summaries.reduce(
      (acc, item) => ({
        taskCount: acc.taskCount + item.taskCount,
        plannedHours: acc.plannedHours + item.plannedHours,
        actualHours: acc.actualHours + item.actualHours,
        difference: acc.actualHours + item.actualHours - (acc.plannedHours + item.plannedHours),
      }),
      { taskCount: 0, plannedHours: 0, actualHours: 0, difference: 0 }
    );
  }

  private isSameMonth(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
  }

  private formatYearMonth(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 0.25単位に量子化（予定工数のみ）
   * - ハミルトン方式相当: 床取り + 残ユニットを小数部の大きい順に配分
   * - タイブレーク: 年月昇順
   */
  private quantizeAllocatedHours(raw: Map<string, number>): Map<string, number> {
    if (raw.size === 0) return raw;
    // 合計はrawの合計を採用（計算誤差対策）
    const rawTotal = Array.from(raw.values()).reduce((a, b) => a + b, 0);
    const unit = 0.25;
    const totalUnits = Math.round(rawTotal / unit);

    const entries = Array.from(raw.entries()).map(([month, hours]) => {
      const unitsRaw = hours / unit;
      const floorUnits = Math.floor(unitsRaw + 1e-9);
      const frac = unitsRaw - floorUnits;
      return { month, hours, unitsRaw, floorUnits, frac };
    });

    const usedUnits = entries.reduce((sum, e) => sum + e.floorUnits, 0);
    let remaining = Math.max(0, totalUnits - usedUnits);

    entries.sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      return a.month.localeCompare(b.month);
    });

    for (let i = 0; i < entries.length && remaining > 0; i++) {
      entries[i].floorUnits += 1;
      remaining -= 1;
    }

    // 昇順で安定化
    entries.sort((a, b) => a.month.localeCompare(b.month));

    const result = new Map<string, number>();
    entries.forEach(e => {
      result.set(e.month, e.floorUnits * unit);
    });
    return result;
  }

  /**
   * 開始日基準による月別・担当者別集計
   * タスクの全工数を予定開始日の月に計上する
   */
  private calculateMonthlyAssigneeSummaryWithStartDateBased(tasks: WbsTaskData[]) {
    const monthlyData: MonthlyAssigneeData[] = [];
    const assignees = new Set<string>();
    const months = new Set<string>();
    const dataMap = new Map<string, MonthlyAssigneeData>();
    const taskDetailsMap = new Map<string, TaskAllocationDetail[]>();

    // タスクごとに開始日の月に全工数を計上
    for (const task of tasks) {
      // 予定開始日がない場合はスキップ
      if (!task.yoteiStart) continue;

      const assigneeName = task.assignee?.displayName ?? '未割当';
      assignees.add(assigneeName);

      // 開始日の月を取得
      const date = new Date(task.yoteiStart);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(yearMonth);

      const key = `${yearMonth}-${assigneeName}`;
      const existing = dataMap.get(key) || {
        assignee: assigneeName,
        month: yearMonth,
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
        taskDetails: [],
      };

      existing.taskCount += 1;
      existing.plannedHours += Number(task.yoteiKosu || 0);
      existing.actualHours += Number(task.jissekiKosu || 0);
      existing.difference = existing.actualHours - existing.plannedHours;

      // タスク詳細を追加
      if (!taskDetailsMap.has(key)) {
        taskDetailsMap.set(key, []);
      }

      const endDate = task.yoteiEnd ? new Date(task.yoteiEnd) : date;
      const taskDetail: TaskAllocationDetail = {
        taskId: task.id,
        taskName: task.name,
        phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
        assignee: assigneeName,
        startDate: date.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalPlannedHours: Number(task.yoteiKosu || 0),
        totalActualHours: Number(task.jissekiKosu || 0),
        monthlyAllocations: [{
          month: yearMonth,
          workingDays: 1, // 開始日基準では固定値
          availableHours: 7.5, // デフォルト値
          allocatedPlannedHours: Number(task.yoteiKosu || 0),
          allocatedActualHours: Number(task.jissekiKosu || 0),
          allocationRatio: 1.0 // 開始日基準では全てその月に計上
        }]
      };
      taskDetailsMap.get(key)!.push(taskDetail);

      dataMap.set(key, existing);
    }

    // monthlyDataにタスク詳細を含める
    for (const [key, data] of dataMap) {
      const taskDetails = taskDetailsMap.get(key) || [];
      monthlyData.push({
        ...data,
        taskDetails: taskDetails
      });
    }

    const sortedMonths = Array.from(months).sort();
    const sortedAssignees = Array.from(assignees).sort();

    // 月別合計
    const monthlyTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};
    sortedMonths.forEach(month => {
      monthlyTotals[month] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      monthlyData
        .filter(data => data.month === month)
        .forEach(data => {
          monthlyTotals[month].taskCount += data.taskCount;
          monthlyTotals[month].plannedHours += data.plannedHours;
          monthlyTotals[month].actualHours += data.actualHours;
          monthlyTotals[month].difference += data.difference;
        });
    });

    // 担当者別合計
    const assigneeTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};
    sortedAssignees.forEach(assignee => {
      assigneeTotals[assignee] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      monthlyData
        .filter(data => data.assignee === assignee)
        .forEach(data => {
          assigneeTotals[assignee].taskCount += data.taskCount;
          assigneeTotals[assignee].plannedHours += data.plannedHours;
          assigneeTotals[assignee].actualHours += data.actualHours;
          assigneeTotals[assignee].difference += data.difference;
        });
    });

    // 全体合計
    const grandTotal = {
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
    };

    Object.values(assigneeTotals).forEach(total => {
      grandTotal.taskCount += total.taskCount;
      grandTotal.plannedHours += total.plannedHours;
      grandTotal.actualHours += total.actualHours;
      grandTotal.difference += total.difference;
    });

    return {
      data: monthlyData,
      months: sortedMonths,
      assignees: sortedAssignees,
      monthlyTotals,
      assigneeTotals,
      grandTotal,
    };
  }
}