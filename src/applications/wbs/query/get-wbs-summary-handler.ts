import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "./get-wbs-summary-query";
import { WbsSummaryResult, PhaseSummary, AssigneeSummary, TaskAllocationDetail, MonthlyAssigneeSummary } from "./wbs-summary-result";
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
import { ForecastCalculationService } from "@/domains/forecast/forecast-calculation.service";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import { toForecastMethodOption } from "@/types/forecast-calculation-method";
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

  /**
   * 集計ハンドラー実行
   * @param query 集計クエリ
   * @returns 集計結果
   */
  async execute(query: GetWbsSummaryQuery): Promise<WbsSummaryResult> {
    // WBSタスクを取得
    const tasks = await this.wbsQueryRepository.getWbsTasks(query.wbsId);

    // 工程リストを取得
    const phases = await this.wbsQueryRepository.getPhases(query.wbsId);

    // 工程別集計
    const phaseSummaries = this.calculatePhaseSummary(tasks, phases);
    const phaseTotal = this.calculateTotal(phaseSummaries);

    // 担当者別集計
    const assigneeSummaries = this.calculateAssigneeSummary(tasks);
    const assigneeTotal = this.calculateTotal(assigneeSummaries);

    // プロジェクト設定を取得（量子化フラグ、進捗測定方式、見通し算出方式）
    const settings = await prisma.projectSettings.findUnique({ where: { projectId: query.projectId } }); // TODO: Repositroyから取得する
    const roundToQuarter = settings?.roundToQuarter === true;
    const progressMeasurementMethod = settings?.progressMeasurementMethod || 'SELF_REPORTED';
    const forecastCalculationMethod = settings?.forecastCalculationMethod || 'REALISTIC';
    const forecastMethodOption = toForecastMethodOption(forecastCalculationMethod);

    // 月別・担当者別集計
    let monthlyAssigneeSummary: MonthlyAssigneeSummary;
    switch (query.calculationMode) {
      case AllocationCalculationMode.BUSINESS_DAY_ALLOCATION: // 営業日案分による月別・担当者別集計
        monthlyAssigneeSummary = await this.calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(
          tasks,
          query.wbsId,
          roundToQuarter,
          progressMeasurementMethod,
          forecastMethodOption
        );
        break;
      case AllocationCalculationMode.START_DATE_BASED: // 開始日基準による月別・担当者別集計
        monthlyAssigneeSummary = this.calculateMonthlyAssigneeSummaryWithStartDateBased(
          tasks,
          progressMeasurementMethod,
          forecastMethodOption
        );
        break;
      default:
        throw new Error(`不明な計算モード: ${query.calculationMode}`);
    }

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
   * 営業日案分による月別・担当者別集計
   * @description
   * ドメインサービス（WorkingHoursAllocationService, AllocationQuantizer, ForecastCalculationService）を使用して
   * 営業日案分を実行し、見通し工数を計算し、MonthlySummaryAccumulatorで集計する
   * @param progressMeasurementMethod 進捗測定方式（0/100法、50/50法、自己申告進捗率）
   */
  private async calculateMonthlyAssigneeSummaryWithBusinessDayAllocation(
    tasks: WbsTaskData[],
    wbsId: number,
    roundToQuarter: boolean,
    progressMeasurementMethod: ProgressMeasurementMethod = 'SELF_REPORTED',
    forecastMethodOption: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual' = 'realistic'
  ) {
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
          task.yoteiEnd ? new Date(task.yoteiEnd) : new Date(task.yoteiStart) // 予定終了日がない場合は予定開始日を使用
        )
        : [];

      // 月別タスク按分を実行
      const allocation = workingHoursAllocationService.allocateTaskWithDetails(
        {
          wbsId,
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name ?? undefined,
          kijunStart: task.kijunStart ? new Date(task.kijunStart) : undefined,
          kijunEnd: task.kijunEnd ? new Date(task.kijunEnd) : undefined,
          kijunKosu: Number(task.kijunKosu || 0),
          yoteiStart: new Date(task.yoteiStart),
          yoteiEnd: task.yoteiEnd ? new Date(task.yoteiEnd) : undefined,
          yoteiKosu: Number(task.yoteiKosu || 0),
          jissekiKosu: Number(task.jissekiKosu || 0)
        },
        wbsAssignee,
        userSchedules,
        quantizer
      );

      // タスク全体の見通し工数を計算（ForecastCalculationService使用）
      const forecastResult = ForecastCalculationService.calculateTaskForecast(task, {
        method: forecastMethodOption,
        progressMeasurementMethod
      });
      const totalForecastHours = forecastResult.forecastHours;

      // 各月の按分結果をアキュムレータに追加
      for (const yearMonth of allocation.getMonths()) {
        const detail = allocation.getAllocation(yearMonth);
        if (!detail) continue;

        // タスク詳細を作成
        const taskDetail: TaskAllocationDetail = {
          taskId: task.id,
          taskName: task.name,
          phase: task.phase?.name ?? undefined,
          assignee: assigneeName,
          startDate: new Date(task.yoteiStart).toISOString().split('T')[0],
          endDate: task.yoteiEnd ? new Date(task.yoteiEnd).toISOString().split('T')[0] : new Date(task.yoteiStart).toISOString().split('T')[0],
          totalPlannedHours: allocation.getTotalPlannedHours(), // 予定工数の合計
          totalActualHours: allocation.getTotalActualHours(), // 実績工数の合計
          monthlyAllocations: allocation.getMonths().map(m => {
            const d = allocation.getAllocation(m)!; // 月別按分詳細
            return {
              month: m, // 月
              workingDays: d.workingDays, // 営業日数
              availableHours: d.availableHours, // 利用可能時間
              allocatedPlannedHours: d.plannedHours, // 配分予定工数
              allocatedActualHours: d.actualHours, // 配分実績工数
              allocationRatio: d.allocationRatio // 配分比率
            };
          })
        };

        // 月別見通し工数を計算（予定工数の比率で按分）
        const totalPlannedHours = allocation.getTotalPlannedHours();
        const monthForecastHours = totalPlannedHours > 0
          ? (detail.plannedHours / totalPlannedHours) * totalForecastHours
          : 0;

        // アキュムレータに追加
        accumulator.addTaskAllocation(
          assigneeName,
          yearMonth,
          detail.plannedHours,
          detail.actualHours,
          detail.baselineHours,
          taskDetail,
          monthForecastHours  // 見通し工数を追加
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
   * MonthlySummaryAccumulatorを使用してシンプルな集計を行い、
   * ForecastCalculationServiceで見通し工数を計算する
   * @param progressMeasurementMethod 進捗測定方式（0/100法、50/50法、自己申告進捗率）
   */
  private calculateMonthlyAssigneeSummaryWithStartDateBased(
    tasks: WbsTaskData[],
    progressMeasurementMethod: ProgressMeasurementMethod = 'SELF_REPORTED',
    forecastMethodOption: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual' = 'realistic'
  ) {
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

      // タスク全体の見通し工数を計算（ForecastCalculationService使用）
      const forecastResult = ForecastCalculationService.calculateTaskForecast(task, {
        method: forecastMethodOption,
        progressMeasurementMethod
      });
      const forecastHours = forecastResult.forecastHours;

      // アキュムレータに追加（開始日基準なので見通し工数も全て開始月に計上）
      accumulator.addTaskAllocation(
        assigneeName,
        yearMonth,
        Number(task.yoteiKosu || 0),
        Number(task.jissekiKosu || 0),
        Number(task.kijunKosu || 0),
        taskDetail,
        forecastHours  // 見通し工数を追加
      );
    }

    // 集計結果を取得して返す
    return accumulator.getTotals();
  }
}