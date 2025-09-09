export class EvmMetrics {
  public readonly pv: number; // Planned Value
  public readonly ev: number; // Earned Value
  public readonly ac: number; // Actual Cost
  public readonly date: Date;

  constructor(args: { pv: number; ev: number; ac: number; date: Date }) {
    this.pv = args.pv;
    this.ev = args.ev;
    this.ac = args.ac;
    this.date = args.date;
  }

  public static create(args: { pv: number; ev: number; ac: number; date: Date }): EvmMetrics {
    return new EvmMetrics(args);
  }

  // Cost Variance (コスト差異)
  get costVariance(): number {
    return this.ev - this.ac;
  }

  // Schedule Variance (スケジュール差異)
  get scheduleVariance(): number {
    return this.ev - this.pv;
  }

  // Cost Performance Index (コスト効率指標)
  get costPerformanceIndex(): number {
    return this.ac === 0 ? 0 : this.ev / this.ac;
  }

  // Schedule Performance Index (スケジュール効率指標)
  get schedulePerformanceIndex(): number {
    return this.pv === 0 ? 0 : this.ev / this.pv;
  }

  // Estimate at Completion (完了時総コスト予測)
  get estimateAtCompletion(): number {
    const cpi = this.costPerformanceIndex;
    if (cpi === 0) return 0;
    
    // 簡易計算: BAC / CPI (Budget at Completion / Cost Performance Index)
    // ここでは AC を基準として計算
    return this.ac / cpi;
  }

  // Estimate to Complete (完了までの残コスト予測)
  get estimateToComplete(): number {
    return Math.max(0, this.estimateAtCompletion - this.ac);
  }

  // プロジェクトの健全性を判定
  get healthStatus(): 'healthy' | 'warning' | 'critical' {
    const cpi = this.costPerformanceIndex;
    const spi = this.schedulePerformanceIndex;

    if (cpi >= 0.9 && spi >= 0.9) return 'healthy';
    if (cpi >= 0.8 && spi >= 0.8) return 'warning';
    return 'critical';
  }
}