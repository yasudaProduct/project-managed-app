import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "./get-wbs-summary-query";
import { WbsSummaryResult, PhaseSummary, AssigneeSummary, MonthlyAssigneeData } from "./wbs-summary-result";
import { SYMBOL } from "@/types/symbol";
import { WbsTaskData, PhaseData } from "@/applications/wbs/query/wbs-query-repository";
import type { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation.service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";

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

    // 月別・担当者別集計（営業日案分ロジック適用）
    const monthlyAssigneeSummary = await this.calculateMonthlyAssigneeSummary(tasks, query.wbsId);

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

  private calculateAssigneeSummary(tasks: WbsTaskData[]): AssigneeSummary[] {
    const summaryMap = new Map<string, AssigneeSummary>();

    tasks.forEach(task => {
      if (task.assignee?.displayName) {
        const key = task.assignee.displayName;
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
      }
    });

    return Array.from(summaryMap.values());
  }

  private async calculateMonthlyAssigneeSummary(tasks: WbsTaskData[], wbsId: number) {
    const monthlyData: MonthlyAssigneeData[] = [];
    const assignees = new Set<string>();
    const months = new Set<string>();
    const dataMap = new Map<string, MonthlyAssigneeData>();

    // 会社休日とWorking Hours Allocation Serviceの準備
    const companyHolidays = await this.companyHolidayRepository.findAll();
    const companyCalendar = new CompanyCalendar(companyHolidays);
    const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);

    // WBS担当者情報を取得
    const wbsAssignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
    const assigneeMap = new Map(wbsAssignees.map(a => [a.userId, a]));

    // タスクごとに営業日案分を適用
    for (const task of tasks) {
      if (!task.assignee?.displayName || !task.yoteiStart) continue;

      const assigneeName = task.assignee.displayName;
      assignees.add(assigneeName);

      // 担当者のWbsAssigneeを取得（稼働率を含む）
      const wbsAssignee = assigneeMap.get(task.assignee.id.toString());
      if (!wbsAssignee) {
        // WbsAssigneeが見つからない場合は従来ロジック
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
        };
        
        existing.taskCount += 1;
        existing.plannedHours += Number(task.yoteiKosu || 0);
        existing.actualHours += Number(task.jissekiKosu || 0);
        existing.difference = existing.actualHours - existing.plannedHours;
        
        dataMap.set(key, existing);
        continue;
      }

      // 月をまたぐかチェック
      const isSameMonth = !task.yoteiEnd || this.isSameMonth(task.yoteiStart, task.yoteiEnd);

      if (isSameMonth) {
        // 単月の場合は従来ロジック
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
        };
        
        existing.taskCount += 1;
        existing.plannedHours += Number(task.yoteiKosu || 0);
        existing.actualHours += Number(task.jissekiKosu || 0);
        existing.difference = existing.actualHours - existing.plannedHours;
        
        dataMap.set(key, existing);
      } else {
        // 月をまたぐ場合は営業日案分
        const startDate = new Date(task.yoteiStart);
        const endDate = new Date(task.yoteiEnd);
        
        // ユーザースケジュールを取得
        const userSchedules = await this.userScheduleRepository.findByUserIdAndDateRange(
          wbsAssignee.userId,
          startDate,
          endDate
        );

        // 営業日案分を実行
        const allocatedHours = workingHoursAllocationService.allocateTaskHoursByAssigneeWorkingDays(
          {
            yoteiStart: startDate,
            yoteiEnd: endDate,
            yoteiKosu: Number(task.yoteiKosu || 0)
          },
          wbsAssignee,
          userSchedules
        );

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
          };
          
          existing.taskCount += 1;
          existing.plannedHours += hours;
          // 実績工数は開始月に計上（TODO: 実績も案分する場合は別途実装）
          if (this.formatYearMonth(startDate) === yearMonth) {
            existing.actualHours += Number(task.jissekiKosu || 0);
          }
          existing.difference = existing.actualHours - existing.plannedHours;
          
          dataMap.set(key, existing);
        });
      }
    }

    monthlyData.push(...dataMap.values());

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
}