import { EvmMetrics } from './evm-metrics';

export class ProjectEvm {
  public readonly projectId: string;
  public readonly projectName: string;
  public readonly metrics: EvmMetrics[];
  public readonly budgetAtCompletion: number; // BAC (プロジェクト総予算)

  constructor(args: { 
    projectId: string; 
    projectName: string; 
    metrics: EvmMetrics[];
    budgetAtCompletion: number;
  }) {
    this.projectId = args.projectId;
    this.projectName = args.projectName;
    this.metrics = args.metrics.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.budgetAtCompletion = args.budgetAtCompletion;
  }

  public static create(args: { 
    projectId: string; 
    projectName: string; 
    metrics: EvmMetrics[];
    budgetAtCompletion: number;
  }): ProjectEvm {
    return new ProjectEvm(args);
  }

  // 最新のメトリクス取得
  get latestMetrics(): EvmMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // プロジェクトの完了率
  get completionPercentage(): number {
    const latest = this.latestMetrics;
    if (!latest || this.budgetAtCompletion === 0) return 0;
    return Math.min(100, (latest.ev / this.budgetAtCompletion) * 100);
  }

  // 累積メトリクス（時系列データ）
  get cumulativeMetrics(): {
    date: Date;
    cumulativePv: number;
    cumulativeEv: number;
    cumulativeAc: number;
  }[] {
    let cumulativePv = 0;
    let cumulativeEv = 0;
    let cumulativeAc = 0;

    return this.metrics.map(metric => {
      cumulativePv += metric.pv;
      cumulativeEv += metric.ev;
      cumulativeAc += metric.ac;

      return {
        date: metric.date,
        cumulativePv,
        cumulativeEv,
        cumulativeAc
      };
    });
  }

  // 指定期間のメトリクス取得
  getMetricsInPeriod(startDate: Date, endDate: Date): EvmMetrics[] {
    return this.metrics.filter(metric => 
      metric.date >= startDate && metric.date <= endDate
    );
  }

  // プロジェクト全体の健全性
  get overallHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const latest = this.latestMetrics;
    return latest ? latest.healthStatus : 'critical';
  }

  // プロジェクト完了予測日（線形予測）
  get estimatedCompletionDate(): Date | null {
    const latest = this.latestMetrics;
    if (!latest || latest.schedulePerformanceIndex <= 0) return null;

    const remainingWork = this.budgetAtCompletion - latest.ev;
    const currentRate = latest.schedulePerformanceIndex;
    const daysToComplete = remainingWork / (latest.ev / this.getProjectDurationDays());
    
    const completionDate = new Date(latest.date);
    completionDate.setDate(completionDate.getDate() + Math.ceil(daysToComplete));
    
    return completionDate;
  }

  private getProjectDurationDays(): number {
    if (this.metrics.length < 2) return 1;
    
    const firstDate = this.metrics[0].date;
    const lastDate = this.metrics[this.metrics.length - 1].date;
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }
}