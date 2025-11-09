import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "./get-wbs-summary-query";
import { WbsSummaryResult, PhaseSummary, AssigneeSummary, TaskAllocationDetail } from "./wbs-summary-result";
import { AllocationCalculationMode } from "./allocation-calculation-mode";
import { SYMBOL } from "@/types/symbol";
import { WbsTaskData, PhaseData } from "@/applications/wbs/query/wbs-query-repository";
import type { IWbsQueryRepository } from "@/applications/wbs/query/wbs-query-repository";
import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation.service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import { AllocationQuantizer } from "@/domains/wbs/allocation-quantizer";
import { MonthlySummaryAccumulator } from "./monthly-summary-accumulator";
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
   * ドメインサービス（WorkingHoursAllocationService, AllocationQuantizer）を使用して
   * 営業日案分を実行し、MonthlySummaryAccumulatorで集計する
   */
  private async calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(tasks: WbsTaskData[], wbsId: number, roundToQuarter: boolean) {
    // 会社休日とWorking Hours Allocation Serviceの準備
    const companyHolidays = await this.companyHolidayRepository.findAll();
    const companyCalendar = new CompanyCalendar(companyHolidays);
    const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);

    // WBS担当者情報(WbsAssigneeモデル)を取得
    const wbsAssignees = await this.wbsAssigneeRepository.findByWbsId(wbsId);
    const assigneeMap = new Map(wbsAssignees.map(a => [a.userId, a]));

    // 量子化器を作成（0.25単位）
    const quantizer = roundToQuarter ? new AllocationQuantizer(0.25) : undefined;

    // 集計用のアキュムレータを作成
    const accumulator = new MonthlySummaryAccumulator();

    // タスクごとに営業日案分を適用
    for (const task of tasks) {
      // 予定開始日がない場合はスキップ（集計月を決定できないため）
      if (!task.yoteiStart) continue;

      // 担当者名を取得 (未割当の場合は'未割当'を返す)
      const assigneeName = task.assignee?.displayName ?? '未割当';

      // 担当者のWbsAssigneeを取得（担当者未割当またはWbsAssignee未登録時はundefined）
      const wbsAssignee = task.assignee ? assigneeMap.get(task.assignee.id.toString()) : undefined;

      // ユーザースケジュールを取得（wbsAssigneeがある場合のみ）
      const userSchedules = wbsAssignee
        ? await this.userScheduleRepository.findByUserIdAndDateRange(
          wbsAssignee.userId,
          new Date(task.yoteiStart),
          task.yoteiEnd ? new Date(task.yoteiEnd) : new Date(task.yoteiStart)
        )
        : [];

      // 月別タスク按分を実行（ドメインサービスに委譲）
      const allocation = workingHoursAllocationService.allocateTaskWithDetails(
        {
          wbsId,
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
          yoteiStart: new Date(task.yoteiStart),
          yoteiEnd: task.yoteiEnd ? new Date(task.yoteiEnd) : undefined,
          yoteiKosu: Number(task.yoteiKosu || 0),
          jissekiKosu: Number(task.jissekiKosu || 0)
        },
        wbsAssignee,
        userSchedules,
        quantizer
      );

      // 各月の按分結果をアキュムレータに追加
      for (const yearMonth of allocation.getMonths()) {
        const detail = allocation.getAllocation(yearMonth);
        if (!detail) continue;

        // タスク詳細を作成
        const taskDetail: TaskAllocationDetail = {
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name || (typeof task.phase === "string" ? task.phase : undefined),
          assignee: assigneeName,
          startDate: new Date(task.yoteiStart).toISOString().split('T')[0],
          endDate: task.yoteiEnd ? new Date(task.yoteiEnd).toISOString().split('T')[0] : new Date(task.yoteiStart).toISOString().split('T')[0],
          totalPlannedHours: allocation.getTotalPlannedHours(),
          totalActualHours: allocation.getTotalActualHours(),
          monthlyAllocations: allocation.getMonths().map(m => {
            const d = allocation.getAllocation(m)!;
            return {
              month: m,
              workingDays: d.workingDays,
              availableHours: d.availableHours,
              allocatedPlannedHours: d.plannedHours,
              allocatedActualHours: d.actualHours,
              allocationRatio: d.allocationRatio
            };
          })
        };

        // アキュムレータに追加
        accumulator.addTaskAllocation(
          assigneeName,
          yearMonth,
          detail.plannedHours,
          detail.actualHours,
          taskDetail
        );
      }
    }

    // 集計結果を取得して返す
    return accumulator.getTotals();
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


  /**
   * 開始日基準による月別・担当者別集計
   * タスクの全工数を予定開始日の月に計上する
   * @description
   * MonthlySummaryAccumulatorを使用してシンプルな集計を行う
   */
  private calculateMonthlyAssigneeSummaryWithStartDateBased(tasks: WbsTaskData[]) {
    const accumulator = new MonthlySummaryAccumulator();

    // タスクごとに開始日の月に全工数を計上
    for (const task of tasks) {
      // 予定開始日がない場合はスキップ
      if (!task.yoteiStart) continue;

      const assigneeName = task.assignee?.displayName ?? '未割当';

      // 開始日の月を取得
      const date = new Date(task.yoteiStart);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;

      const endDate = task.yoteiEnd ? new Date(task.yoteiEnd) : date;

      // タスク詳細を作成（開始日基準では全て単月扱い）
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

      // アキュムレータに追加
      accumulator.addTaskAllocation(
        assigneeName,
        yearMonth,
        Number(task.yoteiKosu || 0),
        Number(task.jissekiKosu || 0),
        taskDetail
      );
    }

    // 集計結果を取得して返す
    return accumulator.getTotals();
  }
}