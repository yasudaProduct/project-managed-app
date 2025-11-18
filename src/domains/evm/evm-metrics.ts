import { ProgressMeasurementMethod } from '@prisma/client';

export type EvmCalculationMode = 'hours' | 'cost';

export class EvmMetrics {
  public readonly pv_base: number; // 基準計画価値
  public readonly pv: number; // Planned Value
  public readonly ev: number; // Earned Value
  public readonly ac: number; // Actual Cost
  public readonly bac: number; // Budget At Completion
  public readonly date: Date;
  public readonly calculationMode: EvmCalculationMode;
  public readonly progressMethod: ProgressMeasurementMethod;

  constructor(args: {
    pv_base: number;
    pv: number;
    ev: number;
    ac: number;
    date: Date;
    bac?: number;
    calculationMode?: EvmCalculationMode;
    progressMethod?: ProgressMeasurementMethod;
  }) {
    this.pv_base = args.pv_base;
    this.pv = args.pv;
    this.ev = args.ev;
    this.ac = args.ac;
    this.date = args.date;
    this.bac = args.bac ?? 0;
    this.calculationMode = args.calculationMode ?? 'hours';
    this.progressMethod = args.progressMethod ?? 'SELF_REPORTED';
  }

  public static create(args: {
    pv_base: number;
    pv: number;
    ev: number;
    ac: number;
    date: Date;
    bac?: number;
    calculationMode?: EvmCalculationMode;
    progressMethod?: ProgressMeasurementMethod;
  }): EvmMetrics {
    return new EvmMetrics(args);
  }

  // Schedule Variance (スケジュール差異)
  get sv(): number {
    return this.ev - this.pv;
  }

  // Cost Variance (コスト差異)
  get cv(): number {
    return this.ev - this.ac;
  }

  // 互換性のためのエイリアス
  get costVariance(): number {
    return this.cv;
  }

  get scheduleVariance(): number {
    return this.sv;
  }

  // Schedule Performance Index (スケジュール効率指標)
  get spi(): number {
    return this.pv === 0 ? 0 : this.ev / this.pv;
  }

  // Cost Performance Index (コスト効率指標)
  get cpi(): number {
    return this.ac === 0 ? 0 : this.ev / this.ac;
  }

  // 互換性のためのエイリアス
  get costPerformanceIndex(): number {
    return this.cpi;
  }

  get schedulePerformanceIndex(): number {
    return this.spi;
  }

  // Estimate At Completion (完了時総コスト予測)
  get eac(): number {
    if (this.cpi === 0) return 0;
    return this.bac / this.cpi;
  }

  // Estimate To Complete (完了までの残コスト予測)
  get etc(): number {
    return Math.max(0, this.eac - this.ac);
  }

  // Variance At Completion (完了時差異予測)
  get vac(): number {
    return this.bac - this.eac;
  }

  // 互換性のためのエイリアス
  get estimateAtCompletion(): number {
    return this.eac;
  }

  get estimateToComplete(): number {
    return this.etc;
  }

  // 完了率
  get completionRate(): number {
    return this.bac === 0 ? 0 : (this.ev / this.bac) * 100;
  }

  // プロジェクトの健全性を判定
  get healthStatus(): 'healthy' | 'warning' | 'critical' {
    if (this.cpi >= 0.9 && this.spi >= 0.9) return 'healthy';
    if (this.cpi >= 0.8 && this.spi >= 0.8) return 'warning';
    return 'critical';
  }

  // 表示用フォーマット（算出方式に応じて単位を変更）
  formatValue(value: number): string {
    if (this.calculationMode === 'cost') {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  }

  // 各指標の表示用フォーマット
  get formattedPv(): string {
    return this.formatValue(this.pv);
  }

  get formattedEv(): string {
    return this.formatValue(this.ev);
  }

  get formattedAc(): string {
    return this.formatValue(this.ac);
  }

  get formattedBac(): string {
    return this.formatValue(this.bac);
  }

  get formattedEac(): string {
    return this.formatValue(this.eac);
  }

  get formattedEtc(): string {
    return this.formatValue(this.etc);
  }

  get formattedSv(): string {
    return this.formatValue(this.sv);
  }

  get formattedCv(): string {
    return this.formatValue(this.cv);
  }
}