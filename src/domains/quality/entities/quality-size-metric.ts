import { QualitySizeUnit } from '../value-objects/quality-enums';

export class QualitySizeMetric {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly unit: QualitySizeUnit;
  public readonly value: number;
  public readonly measuredAt: Date;
  public readonly note?: string;

  private constructor(args: {
    id?: number;
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.unit = args.unit;
    this.value = args.value;
    this.measuredAt = args.measuredAt;
    this.note = args.note;
  }

  public static create(args: {
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
  }): QualitySizeMetric {
    if (args.value <= 0) {
      throw new Error('規模の値は0より大きい必要があります');
    }

    return new QualitySizeMetric(args);
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
  }): QualitySizeMetric {
    return new QualitySizeMetric(args);
  }
}
