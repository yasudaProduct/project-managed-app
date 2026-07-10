import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsQueryRepository } from '@/applications/wbs/query/iwbs-query-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import {
  toForecastTaskInput,
  buildSteadyForecastContext,
} from '@/applications/wbs/query/to-forecast-task-input';
import { ForecastCalculationService } from '@/domains/forecast/forecast-calculation-service';
import { ForecastDateCalculationService } from '@/domains/forecast/forecast-date-calculation-service';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import type {
  ForecastCalculationOptions,
  ForecastCalculationResult,
} from '@/types/forecast-calculation';
import type { SteadyTaskForecastMode } from '@/types/scheduling-settings';

/**
 * 定常タスクの見通し設定（ガント見通しバー算出で使用）。
 */
export interface SteadyForecastConfig {
  keywords: string[];
  mode: SteadyTaskForecastMode;
}

/**
 * タスクごとの見通し日付（ガントチャートの見通しバー用）
 */
export interface TaskForecastDate {
  /** wbs_task.id の文字列表現 */
  taskId: string;
  forecastHours: number;
  actualHours: number;
  remainingHours: number;
  /** 実績開始日。実績未入力・完了タスクは null */
  forecastStartDate: Date | null;
  /** 残工数を基準稼働時間で消化し終える営業日。残0以下は null */
  forecastEndDate: Date | null;
}

export interface IForecastApplicationService {
  calculateTasksForecast(
    wbsId: number,
    options?: ForecastCalculationOptions
  ): Promise<ForecastCalculationResult[]>;

  calculateSingleTaskForecast(
    wbsId: number,
    taskId: string,
    options?: ForecastCalculationOptions
  ): Promise<ForecastCalculationResult | null>;

  calculateTasksForecastDates(
    wbsId: number,
    options?: ForecastCalculationOptions,
    baseDate?: Date,
    steadyConfig?: SteadyForecastConfig
  ): Promise<TaskForecastDate[]>;

  getForecastMethods(): Promise<
    ReadonlyArray<{ value: string; label: string; description: string }>
  >;
}

@injectable()
export class ForecastApplicationService implements IForecastApplicationService {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private readonly wbsQueryRepository: IWbsQueryRepository,
    @inject(SYMBOL.ISystemSettingsRepository)
    private readonly systemSettingsRepository: ISystemSettingsRepository,
    @inject(SYMBOL.ICompanyHolidayRepository)
    private readonly companyHolidayRepository: ICompanyHolidayRepository
  ) {}

  async calculateTasksForecast(
    wbsId: number,
    options: ForecastCalculationOptions = { method: 'realistic' }
  ): Promise<ForecastCalculationResult[]> {
    const tasks = await this.wbsQueryRepository.getWbsTasks(wbsId);
    return ForecastCalculationService.calculateMultipleTasksForecast(
      tasks.map((task) => toForecastTaskInput(task)),
      options
    );
  }

  async calculateSingleTaskForecast(
    wbsId: number,
    taskId: string,
    options: ForecastCalculationOptions = { method: 'realistic' }
  ): Promise<ForecastCalculationResult | null> {
    const tasks = await this.wbsQueryRepository.getWbsTasks(wbsId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      return null;
    }

    return ForecastCalculationService.calculateTaskForecast(
      toForecastTaskInput(task),
      options
    );
  }

  async calculateTasksForecastDates(
    wbsId: number,
    options: ForecastCalculationOptions = { method: 'realistic' },
    baseDate: Date = new Date(),
    steadyConfig?: SteadyForecastConfig
  ): Promise<TaskForecastDate[]> {
    const [tasks, settings, holidays] = await Promise.all([
      this.wbsQueryRepository.getWbsTasks(wbsId),
      this.systemSettingsRepository.get(),
      this.companyHolidayRepository.findAll(),
    ]);
    const calendar = new CompanyCalendar(
      settings.standardWorkingHours,
      holidays
    );

    const steadyOptions: ForecastCalculationOptions = steadyConfig
      ? { ...options, steadyTaskForecastMode: steadyConfig.mode }
      : options;

    return tasks.map((task) => {
      // 定常タスクは進捗率ベースではなく定常方式で見通しを算出する
      const steadyContext = steadyConfig
        ? buildSteadyForecastContext(task, steadyConfig.keywords, calendar, baseDate)
        : undefined;

      const forecast = ForecastCalculationService.calculateTaskForecast(
        toForecastTaskInput(task, steadyContext),
        steadyContext?.isSteady ? steadyOptions : options
      );
      const remainingHours = ForecastDateCalculationService.calculateRemainingHours(
        forecast.forecastHours,
        forecast.actualHours
      );

      // $queryRaw 由来で id が number になるため文字列に正規化する
      const base: TaskForecastDate = {
        taskId: String(task.id),
        forecastHours: forecast.forecastHours,
        actualHours: forecast.actualHours,
        remainingHours,
        forecastStartDate: null,
        forecastEndDate: null,
      };

      // 実績未入力・完了タスクは見通しバーの対象外
      if (!task.jissekiStart || task.status === 'COMPLETED') {
        return base;
      }

      return {
        ...base,
        forecastStartDate: task.jissekiStart,
        // 定常タスクはその日次消費ペースで、通常タスクは基準稼働時間で残見通しを消化して終了日を求める
        forecastEndDate: ForecastDateCalculationService.calculateForecastEndDate(
          {
            forecastHours: forecast.forecastHours,
            actualHours: forecast.actualHours,
            baseDate,
            hoursPerDay: forecast.steadyDailyRate,
          },
          calendar
        ),
      };
    });
  }

  async getForecastMethods() {
    return [
      { value: 'conservative', label: '保守的', description: '実績ベースの推定（高めの見積もり）' },
      { value: 'realistic', label: '現実的', description: '実績と予定の加重平均' },
      { value: 'optimistic', label: '楽観的', description: '実績 + 残り予定' },
    ] as const;
  }
}
