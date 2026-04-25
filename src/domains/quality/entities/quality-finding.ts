import { FindingSource } from '../value-objects/quality-enums';

export class QualityFinding {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly source: FindingSource;
  public readonly injectionPhase?: string;
  public readonly phenomenonType?: string;
  public readonly causeType?: string;
  public readonly category?: string;
  public readonly description?: string;
  public readonly foundAt: Date;
  public readonly resolvedAt?: Date;

  private constructor(args: {
    id?: number;
    targetId: number;
    source: FindingSource;
    injectionPhase?: string;
    phenomenonType?: string;
    causeType?: string;
    category?: string;
    description?: string;
    foundAt: Date;
    resolvedAt?: Date;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.source = args.source;
    this.injectionPhase = args.injectionPhase;
    this.phenomenonType = args.phenomenonType;
    this.causeType = args.causeType;
    this.category = args.category;
    this.description = args.description;
    this.foundAt = args.foundAt;
    this.resolvedAt = args.resolvedAt;
  }

  public static create(args: {
    targetId: number;
    source?: FindingSource;
    injectionPhase?: string;
    phenomenonType?: string;
    causeType?: string;
    category?: string;
    description?: string;
    foundAt: Date;
  }): QualityFinding {
    if (!args.targetId) throw new Error('targetIdは必須です');

    return new QualityFinding({
      ...args,
      source: args.source ?? FindingSource.REVIEW,
    });
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    source: FindingSource;
    injectionPhase?: string;
    phenomenonType?: string;
    causeType?: string;
    category?: string;
    description?: string;
    foundAt: Date;
    resolvedAt?: Date;
  }): QualityFinding {
    return new QualityFinding(args);
  }
}
