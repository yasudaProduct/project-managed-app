import { QualitySizeUnit } from './value-objects/quality-enums';

export class QualitySizeMetric {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly unit: QualitySizeUnit;
  public readonly value: number;
  public readonly measuredAt: Date;
  public readonly note?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.unit = args.unit;
    this.value = args.value;
    this.measuredAt = args.measuredAt;
    this.note = args.note;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
  }): QualitySizeMetric {
    if ((args.unit as string) === 'MAN_HOUR') {
      throw new Error('MAN_HOURは保存できません。実績工数は都度集計されます');
    }
    if (args.value <= 0) {
      throw new Error('規模の値は0より大きい必要があります');
    }

    return new QualitySizeMetric({
      targetId: args.targetId,
      unit: args.unit,
      value: args.value,
      measuredAt: args.measuredAt,
      note: args.note,
    });
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    unit: QualitySizeUnit;
    value: number;
    measuredAt: Date;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): QualitySizeMetric {
    return new QualitySizeMetric(args);
  }
}
