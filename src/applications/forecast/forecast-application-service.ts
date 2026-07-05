import { injectable, inject } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsQueryRepository } from '@/applications/wbs/query/wbs-query-repository';
import { toForecastTaskInput } from '@/applications/wbs/query/to-forecast-task-input';
import { ForecastCalculationService } from '@/domains/forecast/forecast-calculation-service';
import type {
  ForecastCalculationOptions,
  ForecastCalculationResult,
} from '@/types/forecast-calculation';

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

  getForecastMethods(): Promise<
    ReadonlyArray<{ value: string; label: string; description: string }>
  >;
}

@injectable()
export class ForecastApplicationService implements IForecastApplicationService {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private readonly wbsQueryRepository: IWbsQueryRepository
  ) {}

  async calculateTasksForecast(
    wbsId: number,
    options: ForecastCalculationOptions = { method: 'realistic' }
  ): Promise<ForecastCalculationResult[]> {
    const tasks = await this.wbsQueryRepository.getWbsTasks(wbsId);
    return ForecastCalculationService.calculateMultipleTasksForecast(
      tasks.map(toForecastTaskInput),
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

  async getForecastMethods() {
    return [
      { value: 'conservative', label: '保守的', description: '実績ベースの推定（高めの見積もり）' },
      { value: 'realistic', label: '現実的', description: '実績と予定の加重平均' },
      { value: 'optimistic', label: '楽観的', description: '実績 + 残り予定' },
    ] as const;
  }
}
