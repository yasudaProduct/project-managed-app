import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsSummaryQuery } from "./get-wbs-summary-query";
import { WbsSummaryResult, PhaseSummary, AssigneeSummary, TaskAllocationDetail, MonthlyAssigneeSummary } from "./wbs-summary-result";
import { AllocationCalculationMode } from "./allocation-calculation-mode";
import { SYMBOL } from "@/types/symbol";
import { WbsTaskData, PhaseData, TaskActualMonthly } from "@/applications/wbs/query/iwbs-query-repository";
import type { IWbsQueryRepository } from "@/applications/wbs/query/iwbs-query-repository";
import { WorkingHoursAllocationService } from "@/domains/calendar/working-hours-allocation-service";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import type { ISystemSettingsRepository } from "@/applications/system-settings/isystem-settings-repository";
import { AllocationQuantizer } from "@/domains/wbs/allocation-quantizer";
import { MonthlySummaryAccumulator } from "./monthly-summary-accumulator";
import { MonthlyPhaseSummaryAccumulator } from "./monthly-phase-summary-accumulator";
import { ForecastCalculationService } from "@/domains/forecast/forecast-calculation-service";
import { toForecastTaskInput } from "@/applications/wbs/query/to-forecast-task-input";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import { toForecastMethodOption } from "@/types/forecast-calculation-method";
import { distributeForecastAcrossMonths } from "./monthly-forecast-distributor";
import type { IProjectSettingsRepository } from "@/applications/project-settings/iproject-settings-repository";
import { withProjectSettingsDefaults } from "@/types/project-settings";

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
    private readonly wbsAssigneeRepository: IWbsAssigneeRepository,
    @inject(SYMBOL.ISystemSettingsRepository)
    private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.IProjectSettingsRepository)
    private readonly projectSettingsRepository: IProjectSettingsRepository
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

    // work_records の月別実績を取得（月別集計の「実績」列を実作業月・実作業者ベースで算出する）
    const taskActualsMonthly = await this.wbsQueryRepository.getTaskActualHoursByMonth(query.wbsId);
    const taskActualsMap = buildTaskActualsMap(taskActualsMonthly);

    // 工程別集計
    const phaseSummaries = this.calculatePhaseSummary(tasks, phases);
    const phaseTotal = this.calculateTotal(phaseSummaries);

    // WBS担当者情報を取得（担当者別集計と月別集計の両方で使用）
    const wbsAssignees = await this.wbsAssigneeRepository.findByWbsId(query.wbsId);

    // 担当者別集計
    const assigneeSummaries = this.calculateAssigneeSummary(tasks, wbsAssignees);
    const assigneeTotal = this.calculateTotal(assigneeSummaries);

    // プロジェクト設定を取得（量子化フラグ、進捗測定方式、見通し算出方式）
    const rawSettings = await this.projectSettingsRepository.findByProjectId(query.projectId);
    const settings = withProjectSettingsDefaults(query.projectId, rawSettings);
    const roundToQuarter = settings.roundToQuarter;
    const progressMeasurementMethod = settings.progressMeasurementMethod;
    const forecastCalculationMethod = settings.forecastCalculationMethod;
    const forecastMethodOption = toForecastMethodOption(forecastCalculationMethod);

    // 月別・担当者別集計
    let monthlyAssigneeSummary: MonthlyAssigneeSummary;
    let monthlyPhaseSummary;
    switch (query.calculationMode) {
      case AllocationCalculationMode.BUSINESS_DAY_ALLOCATION: // 営業日案分による月別・担当者別集計
        {
          const monthlySummaries = await this.calculateMonthlySummariesWithBusinessDayAllocation(
            tasks,
            query.wbsId,
            roundToQuarter,
            progressMeasurementMethod,
            forecastMethodOption,
            phases,
            wbsAssignees,
            taskActualsMap
          );
          monthlyAssigneeSummary = monthlySummaries.assignee;
          monthlyPhaseSummary = monthlySummaries.phase;
          break;
        }
      case AllocationCalculationMode.START_DATE_BASED: // 開始日基準による月別・担当者別集計
        {
          const monthlySummaries = this.calculateMonthlySummariesWithStartDateBased(
            tasks,
            progressMeasurementMethod,
            forecastMethodOption,
            phases,
            wbsAssignees,
            taskActualsMap
          );
          monthlyAssigneeSummary = monthlySummaries.assignee;
          monthlyPhaseSummary = monthlySummaries.phase;
          break;
        }
      default:
        throw new Error(`不明な計算モード: ${query.calculationMode}`);
    }

    return {
      phaseSummaries,
      phaseTotal,
      assigneeSummaries,
      assigneeTotal,
      monthlyAssigneeSummary,
      monthlyPhaseSummary,
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

    // 初期化（seqを含める）
    phases.forEach(phase => {
      summaryMap.set(phase.name, {
        phase: phase.name,
        seq: phase.seq,
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

    return Array.from(summaryMap.values()).sort((a, b) => a.seq - b.seq);
  }

  /**
   * 担当者別集計
   * @param tasks タスクデータ
   * @returns 担当者別集計
   * 
   * @description
   * 担当者ごとにタスク数、予定工数、実績工数、差分を計算する
   */
  private calculateAssigneeSummary(tasks: WbsTaskData[], wbsAssignees: import("@/domains/wbs/wbs-assignee").WbsAssignee[]): AssigneeSummary[] {
    // 担当者名 → seq のマップを構築
    const assigneeSeqMap = new Map<string, number>();
    wbsAssignees.forEach(a => {
      if (a.userName) {
        assigneeSeqMap.set(a.userName, a.seq);
      }
    });

    const summaryMap = new Map<string, AssigneeSummary>();

    tasks.forEach(task => {
      const key = task.assignee ? task.assignee.displayName : '未割当';
      const existing = summaryMap.get(key) || {
        assignee: key,
        seq: assigneeSeqMap.get(key) ?? Number.MAX_SAFE_INTEGER,
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

    return Array.from(summaryMap.values()).sort((a, b) => a.seq - b.seq);
  }

  /**
   * 営業日案分による月別・担当者別集計
   * @description
   * ドメインサービス（WorkingHoursAllocationService, AllocationQuantizer, ForecastCalculationService）を使用して
   * 営業日案分を実行し、見通し工数を計算し、MonthlySummaryAccumulatorで集計する
   * @param progressMeasurementMethod 進捗測定方式（0/100法、50/50法、自己申告進捗率）
   */
  private async calculateMonthlySummariesWithBusinessDayAllocation(
    tasks: WbsTaskData[],
    wbsId: number,
    roundToQuarter: boolean,
    progressMeasurementMethod: ProgressMeasurementMethod = 'SELF_REPORTED',
    forecastMethodOption: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual' = 'realistic',
    phases: PhaseData[] = [],
    wbsAssignees: import("@/domains/wbs/wbs-assignee").WbsAssignee[] = [],
    taskActualsMap: Map<string, TaskActualMonthly[]> = new Map()
  ) {
    // 会社休日とWorking Hours Allocation Serviceの準備
    const systemSettings = await this.systemSettingsRepository.get();
    const companyHolidays = await this.companyHolidayRepository.findAll();
    const companyCalendar = new CompanyCalendar(
      systemSettings.standardWorkingHours,
      companyHolidays
    );
    const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);

    const assigneeMap = new Map(wbsAssignees.map(a => [a.userId, a]));

    // 量子化器を作成（0.25単位）
    const quantizer = roundToQuarter ? new AllocationQuantizer(0.25) : undefined;

    // 集計用のアキュムレータを作成（seq情報を渡す）
    const assigneeSeqMap = new Map<string, number>();
    wbsAssignees.forEach(a => {
      if (a.userName) assigneeSeqMap.set(a.userName, a.seq);
    });
    const phaseSeqMap = new Map<string, number>();
    phases.forEach(p => phaseSeqMap.set(p.name, p.seq));

    const assigneeAccumulator = new MonthlySummaryAccumulator(assigneeSeqMap);
    const phaseAccumulator = new MonthlyPhaseSummaryAccumulator(phaseSeqMap);

    // タスクごとに集計を実行
    for (const task of tasks) {
      const taskAssigneeName = task.assignee?.displayName ?? '未割当';
      const phaseName = task.phase?.name ?? '未設定';
      const actuals = taskActualsMap.get(String(task.id)) ?? [];

      // 予定開始日がない場合は按分スキップ。ただし work_records による実績があれば集計に含める
      let allocation: import("@/domains/wbs/monthly-task-allocation").MonthlyTaskAllocation | null = null;
      let totalForecastHours = 0;

      if (task.yoteiStart) {
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

        allocation = workingHoursAllocationService.allocateTaskWithDetails(
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

        const forecastResult = ForecastCalculationService.calculateTaskForecast(
          toForecastTaskInput(task),
          {
            method: forecastMethodOption,
            progressMeasurementMethod
          }
        );
        totalForecastHours = forecastResult.forecastHours;
      }

      // work_records を月別に集計（taskDetail 構築用）
      const actualByMonth = new Map<string, number>();
      for (const a of actuals) {
        actualByMonth.set(a.yearMonth, (actualByMonth.get(a.yearMonth) ?? 0) + a.hoursWorked);
      }

      // 月別の見通し工数を算出（実績発生月を考慮して配分）
      const plannedByMonth = new Map<string, number>();
      if (allocation) {
        for (const m of allocation.getMonths()) {
          plannedByMonth.set(m, allocation.getAllocation(m)!.plannedHours);
        }
      }
      const forecastByMonth = distributeForecastAcrossMonths(
        totalForecastHours,
        plannedByMonth,
        actualByMonth
      );

      // タスク詳細を構築（予定月 ∪ 実績月）
      const taskDetail = buildTaskDetail(task, taskAssigneeName, allocation, actualByMonth);

      // 月 × 担当者の合流マップを構築（予定はタスク担当者、実績は work_records の実作業者）
      // 見通しは予定月ではタスク担当者へ、予定がなく実績のみの月では実作業者へ計上する。
      const rowsA = new Map<string, {
        assignee: string;
        yearMonth: string;
        plannedHours: number;
        actualHours: number;
        baselineHours: number;
        forecastHours: number;
      }>();
      if (allocation) {
        for (const m of allocation.getMonths()) {
          const d = allocation.getAllocation(m)!;
          const key = `${m}:${taskAssigneeName}`;
          rowsA.set(key, {
            assignee: taskAssigneeName,
            yearMonth: m,
            plannedHours: d.plannedHours,
            actualHours: 0,
            baselineHours: d.baselineHours,
            forecastHours: forecastByMonth.get(m) ?? 0,
          });
        }
      }
      for (const a of actuals) {
        const key = `${a.yearMonth}:${a.userDisplayName}`;
        const existing = rowsA.get(key);
        if (existing) {
          existing.actualHours += a.hoursWorked;
        } else {
          rowsA.set(key, {
            assignee: a.userDisplayName,
            yearMonth: a.yearMonth,
            plannedHours: 0,
            actualHours: a.hoursWorked,
            baselineHours: 0,
            forecastHours: 0,
          });
        }
      }
      // 予定外の月に発生した実績については、その月の見通しを実作業者行に割り当てる
      // （タスク担当者行には計上されない）。
      for (const [m, forecast] of forecastByMonth.entries()) {
        if (allocation?.getAllocation(m)) continue; // 予定あり月は既に処理済み
        const actualRowsInMonth = Array.from(rowsA.values()).filter(r => r.yearMonth === m);
        const totalActualInMonth = actualRowsInMonth.reduce((s, r) => s + r.actualHours, 0);
        if (totalActualInMonth > 0) {
          for (const row of actualRowsInMonth) {
            row.forecastHours = forecast * (row.actualHours / totalActualInMonth);
          }
        }
      }
      for (const row of rowsA.values()) {
        assigneeAccumulator.addTaskAllocation(
          row.assignee,
          row.yearMonth,
          row.plannedHours,
          row.actualHours,
          row.baselineHours,
          taskDetail,
          row.forecastHours
        );
      }

      // 月 × 工程の合流マップ（工程はタスク固定のため月だけがキー）
      const rowsP = new Map<string, {
        yearMonth: string;
        plannedHours: number;
        actualHours: number;
        baselineHours: number;
        forecastHours: number;
      }>();
      if (allocation) {
        for (const m of allocation.getMonths()) {
          const d = allocation.getAllocation(m)!;
          rowsP.set(m, {
            yearMonth: m,
            plannedHours: d.plannedHours,
            actualHours: 0,
            baselineHours: d.baselineHours,
            forecastHours: forecastByMonth.get(m) ?? 0,
          });
        }
      }
      for (const [m, hours] of actualByMonth.entries()) {
        const existing = rowsP.get(m);
        if (existing) {
          existing.actualHours += hours;
        } else {
          rowsP.set(m, {
            yearMonth: m,
            plannedHours: 0,
            actualHours: hours,
            baselineHours: 0,
            forecastHours: forecastByMonth.get(m) ?? 0,
          });
        }
      }
      for (const row of rowsP.values()) {
        phaseAccumulator.addTaskAllocation(
          phaseName,
          row.yearMonth,
          row.plannedHours,
          row.actualHours,
          row.baselineHours,
          taskDetail,
          row.forecastHours
        );
      }
    }

    // 集計結果を取得して返す
    return {
      assignee: assigneeAccumulator.getTotals(),
      phase: phaseAccumulator.getTotals(),
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

  /**
   * 開始日基準による月別・担当者別集計
   * タスクの全工数を予定開始日の月に計上する
   * @description
   * MonthlySummaryAccumulatorを使用してシンプルな集計を行い、
   * ForecastCalculationServiceで見通し工数を計算する
   * @param progressMeasurementMethod 進捗測定方式（0/100法、50/50法、自己申告進捗率）
   */
  private calculateMonthlySummariesWithStartDateBased(
    tasks: WbsTaskData[],
    progressMeasurementMethod: ProgressMeasurementMethod = 'SELF_REPORTED',
    forecastMethodOption: 'conservative' | 'realistic' | 'optimistic' | 'plannedOrActual' = 'realistic',
    phases: PhaseData[] = [],
    wbsAssignees: import("@/domains/wbs/wbs-assignee").WbsAssignee[] = [],
    taskActualsMap: Map<string, TaskActualMonthly[]> = new Map()
  ) {
    // seq情報を構築
    const assigneeSeqMap = new Map<string, number>();
    wbsAssignees.forEach(a => {
      if (a.userName) assigneeSeqMap.set(a.userName, a.seq);
    });
    const phaseSeqMap = new Map<string, number>();
    phases.forEach(p => phaseSeqMap.set(p.name, p.seq));

    const assigneeAccumulator = new MonthlySummaryAccumulator(assigneeSeqMap);
    const phaseAccumulator = new MonthlyPhaseSummaryAccumulator(phaseSeqMap);

    for (const task of tasks) {
      const taskAssigneeName = task.assignee?.displayName ?? '未割当';
      const phaseName = task.phase?.name || (typeof task.phase === "string" ? task.phase : '未設定');
      const actuals = taskActualsMap.get(String(task.id)) ?? [];

      // 予定開始月（yoteiStart があれば）
      let plannedYearMonth: string | null = null;
      let totalForecastHours = 0;
      if (task.yoteiStart) {
        const date = new Date(task.yoteiStart);
        plannedYearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;

        const forecastResult = ForecastCalculationService.calculateTaskForecast(
          toForecastTaskInput(task),
          {
            method: forecastMethodOption,
            progressMeasurementMethod
          }
        );
        totalForecastHours = forecastResult.forecastHours;
      }

      // work_records を月別に集計
      const actualByMonth = new Map<string, number>();
      for (const a of actuals) {
        actualByMonth.set(a.yearMonth, (actualByMonth.get(a.yearMonth) ?? 0) + a.hoursWorked);
      }

      // 月別の見通し工数を算出（開始日基準では予定は単月）
      const plannedByMonth = new Map<string, number>();
      if (plannedYearMonth) {
        plannedByMonth.set(plannedYearMonth, Number(task.yoteiKosu || 0));
      }
      const forecastByMonth = distributeForecastAcrossMonths(
        totalForecastHours,
        plannedByMonth,
        actualByMonth
      );

      // タスク詳細を構築
      const taskDetail = buildTaskDetailForStartDateBased(
        task,
        taskAssigneeName,
        plannedYearMonth,
        actualByMonth
      );

      // 月 × 担当者の合流マップ
      // 見通しは予定月ではタスク担当者へ、予定外の実績月では実作業者へ計上する。
      const rowsA = new Map<string, {
        assignee: string;
        yearMonth: string;
        plannedHours: number;
        actualHours: number;
        baselineHours: number;
        forecastHours: number;
      }>();
      if (plannedYearMonth) {
        rowsA.set(`${plannedYearMonth}:${taskAssigneeName}`, {
          assignee: taskAssigneeName,
          yearMonth: plannedYearMonth,
          plannedHours: Number(task.yoteiKosu || 0),
          actualHours: 0,
          baselineHours: Number(task.kijunKosu || 0),
          forecastHours: forecastByMonth.get(plannedYearMonth) ?? 0,
        });
      }
      for (const a of actuals) {
        const key = `${a.yearMonth}:${a.userDisplayName}`;
        const existing = rowsA.get(key);
        if (existing) {
          existing.actualHours += a.hoursWorked;
        } else {
          rowsA.set(key, {
            assignee: a.userDisplayName,
            yearMonth: a.yearMonth,
            plannedHours: 0,
            actualHours: a.hoursWorked,
            baselineHours: 0,
            forecastHours: 0,
          });
        }
      }
      // 予定外月の見通し工数を実作業者行へ実績比で割り当て
      for (const [m, forecast] of forecastByMonth.entries()) {
        if (m === plannedYearMonth) continue;
        const actualRowsInMonth = Array.from(rowsA.values()).filter(r => r.yearMonth === m);
        const totalActualInMonth = actualRowsInMonth.reduce((s, r) => s + r.actualHours, 0);
        if (totalActualInMonth > 0) {
          for (const row of actualRowsInMonth) {
            row.forecastHours = forecast * (row.actualHours / totalActualInMonth);
          }
        }
      }
      for (const row of rowsA.values()) {
        assigneeAccumulator.addTaskAllocation(
          row.assignee,
          row.yearMonth,
          row.plannedHours,
          row.actualHours,
          row.baselineHours,
          taskDetail,
          row.forecastHours
        );
      }

      // 月 × 工程の合流マップ
      const rowsP = new Map<string, {
        yearMonth: string;
        plannedHours: number;
        actualHours: number;
        baselineHours: number;
        forecastHours: number;
      }>();
      if (plannedYearMonth) {
        rowsP.set(plannedYearMonth, {
          yearMonth: plannedYearMonth,
          plannedHours: Number(task.yoteiKosu || 0),
          actualHours: 0,
          baselineHours: Number(task.kijunKosu || 0),
          forecastHours: forecastByMonth.get(plannedYearMonth) ?? 0,
        });
      }
      for (const [m, hours] of actualByMonth.entries()) {
        const existing = rowsP.get(m);
        if (existing) {
          existing.actualHours += hours;
        } else {
          rowsP.set(m, {
            yearMonth: m,
            plannedHours: 0,
            actualHours: hours,
            baselineHours: 0,
            forecastHours: forecastByMonth.get(m) ?? 0,
          });
        }
      }
      for (const row of rowsP.values()) {
        phaseAccumulator.addTaskAllocation(
          phaseName ?? '未設定',
          row.yearMonth,
          row.plannedHours,
          row.actualHours,
          row.baselineHours,
          taskDetail,
          row.forecastHours
        );
      }
    }

    return {
      assignee: assigneeAccumulator.getTotals(),
      phase: phaseAccumulator.getTotals(),
    };
  }
}

/**
 * タスク ID 単位で月別実績リストに束ねる
 */
function buildTaskActualsMap(actuals: TaskActualMonthly[]): Map<string, TaskActualMonthly[]> {
  const map = new Map<string, TaskActualMonthly[]>();
  for (const a of actuals) {
    const key = String(a.taskId);
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }
  return map;
}

/**
 * 営業日按分モードでの taskDetail 構築（予定月 ∪ 実績月）
 */
function buildTaskDetail(
  task: WbsTaskData,
  taskAssigneeName: string,
  allocation: import("@/domains/wbs/monthly-task-allocation").MonthlyTaskAllocation | null,
  actualByMonth: Map<string, number>
): TaskAllocationDetail {
  const startDateIso = task.yoteiStart ? new Date(task.yoteiStart).toISOString().split('T')[0] : '';
  const endDateIso = task.yoteiEnd
    ? new Date(task.yoteiEnd).toISOString().split('T')[0]
    : startDateIso;

  const plannedMonths = allocation ? allocation.getMonths() : [];
  const allMonths = Array.from(new Set([...plannedMonths, ...actualByMonth.keys()])).sort();

  const monthlyAllocations = allMonths.map(m => {
    const d = allocation?.getAllocation(m);
    return {
      month: m,
      workingDays: d?.workingDays ?? 0,
      availableHours: d?.availableHours ?? 0,
      allocatedPlannedHours: d?.plannedHours ?? 0,
      allocatedActualHours: actualByMonth.get(m) ?? 0,
      allocationRatio: d?.allocationRatio ?? 0,
    };
  });

  const totalActualHours = Array.from(actualByMonth.values()).reduce((sum, h) => sum + h, 0);

  return {
    taskId: task.id,
    taskName: task.name,
    phase: task.phase?.name ?? undefined,
    assignee: taskAssigneeName,
    startDate: startDateIso,
    endDate: endDateIso,
    totalPlannedHours: allocation?.getTotalPlannedHours() ?? 0,
    totalActualHours,
    monthlyAllocations,
  };
}

/**
 * 開始日基準モードでの taskDetail 構築
 */
function buildTaskDetailForStartDateBased(
  task: WbsTaskData,
  taskAssigneeName: string,
  plannedYearMonth: string | null,
  actualByMonth: Map<string, number>
): TaskAllocationDetail {
  const startDateIso = task.yoteiStart ? new Date(task.yoteiStart).toISOString().split('T')[0] : '';
  const endDateIso = task.yoteiEnd
    ? new Date(task.yoteiEnd).toISOString().split('T')[0]
    : startDateIso;

  const allMonths = new Set<string>();
  if (plannedYearMonth) allMonths.add(plannedYearMonth);
  for (const m of actualByMonth.keys()) allMonths.add(m);

  const monthlyAllocations = Array.from(allMonths).sort().map(m => ({
    month: m,
    workingDays: m === plannedYearMonth ? 1 : 0,
    availableHours: m === plannedYearMonth ? 7.5 : 0,
    allocatedPlannedHours: m === plannedYearMonth ? Number(task.yoteiKosu || 0) : 0,
    allocatedActualHours: actualByMonth.get(m) ?? 0,
    allocationRatio: m === plannedYearMonth ? 1.0 : 0,
  }));

  const totalActualHours = Array.from(actualByMonth.values()).reduce((sum, h) => sum + h, 0);

  return {
    taskId: task.id,
    taskName: task.name,
    phase: task.phase?.name ?? undefined,
    assignee: taskAssigneeName,
    startDate: startDateIso,
    endDate: endDateIso,
    totalPlannedHours: Number(task.yoteiKosu || 0),
    totalActualHours,
    monthlyAllocations,
  };
}