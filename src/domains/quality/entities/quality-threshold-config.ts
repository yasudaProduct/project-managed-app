export class QualityThresholdConfig {
  public readonly id?: number;
  public readonly wbsId: number;
  public readonly metricKey: string;
  public readonly phaseCode?: string;
  public readonly upperLimit?: number;
  public readonly lowerLimit?: number;
  public readonly warnThreshold?: number;
  public readonly dangerThreshold?: number;
  public readonly referenceValue?: number;
  public readonly note?: string;

  private constructor(args: {
    id?: number;
    wbsId: number;
    metricKey: string;
    phaseCode?: string;
    upperLimit?: number;
    lowerLimit?: number;
    warnThreshold?: number;
    dangerThreshold?: number;
    referenceValue?: number;
    note?: string;
  }) {
    this.id = args.id;
    this.wbsId = args.wbsId;
    this.metricKey = args.metricKey;
    this.phaseCode = args.phaseCode;
    this.upperLimit = args.upperLimit;
    this.lowerLimit = args.lowerLimit;
    this.warnThreshold = args.warnThreshold;
    this.dangerThreshold = args.dangerThreshold;
    this.referenceValue = args.referenceValue;
    this.note = args.note;
  }

  public static create(args: {
    wbsId: number;
    metricKey: string;
    phaseCode?: string;
    upperLimit?: number;
    lowerLimit?: number;
    warnThreshold?: number;
    dangerThreshold?: number;
    referenceValue?: number;
    note?: string;
  }): QualityThresholdConfig {
    if (!args.wbsId) throw new Error('wbsIdは必須です');
    if (!args.metricKey) throw new Error('metricKeyは必須です');

    return new QualityThresholdConfig(args);
  }

  public static reconstruct(args: {
    id: number;
    wbsId: number;
    metricKey: string;
    phaseCode?: string;
    upperLimit?: number;
    lowerLimit?: number;
    warnThreshold?: number;
    dangerThreshold?: number;
    referenceValue?: number;
    note?: string;
  }): QualityThresholdConfig {
    return new QualityThresholdConfig(args);
  }

  public isInZone(value: number): boolean {
    if (this.upperLimit !== undefined && value > this.upperLimit) return false;
    if (this.lowerLimit !== undefined && value < this.lowerLimit) return false;
    return true;
  }
}
