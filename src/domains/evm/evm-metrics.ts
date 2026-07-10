import type { ProgressMeasurementMethod } from '@/types/progress-measurement';
import type { EvmForecastMethod } from '@/types/evm-forecast-method';
import type { EvmCalculationMode } from '@/types/evm';

export type { EvmCalculationMode };

type EvmMetricsArgs = {
  pv_base: number;
  pv: number;
  ev: number;
  ac: number;
  date: Date;
  bac?: number;
  calculationMode?: EvmCalculationMode;
  progressMethod?: ProgressMeasurementMethod;
  isPredicted?: boolean;
  forecastMethod?: EvmForecastMethod;
  healthyThreshold?: number;
  warningThreshold?: number;
};

export type EvmHealthStatus = 'healthy' | 'warning' | 'critical' | 'no_data';

export class EvmMetrics {
  public readonly pv_base: number; // 基準計画価値
  public readonly pv: number; // Planned Value
  public readonly ev: number; // Earned Value
  public readonly ac: number; // Actual Cost
  public readonly bac: number; // Budget At Completion
  public readonly date: Date;
  public readonly calculationMode: EvmCalculationMode;
  public readonly progressMethod: ProgressMeasurementMethod;
  public readonly isPredicted: boolean;
  public readonly forecastMethod: EvmForecastMethod;
  public readonly healthyThreshold: number;
  public readonly warningThreshold: number;

  constructor(args: EvmMetricsArgs) {
    this.pv_base = args.pv_base;
    this.pv = args.pv;
    this.ev = args.ev;
    this.ac = args.ac;
    this.date = args.date;
    this.bac = args.bac ?? 0;
    this.calculationMode = args.calculationMode ?? 'hours';
    this.progressMethod = args.progressMethod ?? 'SELF_REPORTED';
    this.isPredicted = args.isPredicted ?? false;
    this.forecastMethod = args.forecastMethod ?? 'CPI_ONLY';
    this.healthyThreshold = args.healthyThreshold ?? 0.9;
    this.warningThreshold = args.warningThreshold ?? 0.8;
  }

  public static create(args: EvmMetricsArgs): EvmMetrics {
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

  // Schedule Performance Index (スケジュール効率指標)
  // PV未発生（計画期間前）は「進捗ゼロ」ではなく未定義としてnullを返す
  get spi(): number | null {
    return this.pv === 0 ? null : this.ev / this.pv;
  }

  // Cost Performance Index (コスト効率指標)
  // AC未発生（実績未投入）は未定義としてnullを返す
  get cpi(): number | null {
    return this.ac === 0 ? null : this.ev / this.ac;
  }

  // Estimate At Completion (完了時総コスト予測)
  // AC + ETC
  get eac(): number {
    // if (this.cpi === 0) return 0;
    // return this.bac / this.cpi;
    return this.ac + this.etc;
  }

  // Estimate To Complete (完了までの残コスト予測)
  // 未定義（null）の効率指標は「計画通り＝係数1」とみなす。CPI=0（実コスト発生済みで出来高ゼロ）は
  // 効率が算出不能のため従来通り0を返す（ゼロ除算回避）。
  get etc(): number {
    // EV > BAC（予定工数が基準を超えて増えた場合等）でも残作業は負にならないため0を下限とする
    const remaining = Math.max(0, this.bac - this.ev);
    switch (this.forecastMethod) {
      case 'CPI_SPI': {
        const cpiSpi = (this.cpi ?? 1) * (this.spi ?? 1);
        return cpiSpi === 0 ? 0 : remaining / cpiSpi;
      }
      case 'PLANNED':
        return remaining;
      case 'CPI_ONLY':
      default: {
        if (this.cpi === null) return remaining;
        return this.cpi === 0 ? 0 : remaining / this.cpi;
      }
    }
  }

  // Variance At Completion (完了時差異予測)
  // BAC - EAC
  get vac(): number {
    return this.bac - this.eac;
  }

  // 完了率
  get completionRate(): number {
    return this.bac === 0 ? 0 : (this.ev / this.bac) * 100;
  }

  // プロジェクトの健全性を判定
  // 両指標が未定義（開始前・実績未投入）ならno_data。片方のみ未定義なら残る指標だけで判定する。
  get healthStatus(): EvmHealthStatus {
    const indicators = [this.cpi, this.spi].filter(
      (v): v is number => v !== null
    );
    if (indicators.length === 0) return 'no_data';
    if (indicators.every((v) => v >= this.healthyThreshold)) return 'healthy';
    if (indicators.every((v) => v >= this.warningThreshold)) return 'warning';
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