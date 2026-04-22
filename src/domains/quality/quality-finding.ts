import { FindingSource } from './value-objects/quality-enums';

export class QualityFinding {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly source: FindingSource;
  public readonly category?: string;
  public readonly description?: string;
  public readonly foundAt: Date;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    targetId: number;
    source: FindingSource;
    category?: string;
    description?: string;
    foundAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.source = args.source;
    this.category = args.category;
    this.description = args.description;
    this.foundAt = args.foundAt;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    targetId: number;
    source?: FindingSource;
    category?: string;
    description?: string;
    foundAt: Date;
  }): QualityFinding {
    if (!args.targetId) throw new Error('targetIdは必須です');

    return new QualityFinding({
      targetId: args.targetId,
      source: args.source ?? FindingSource.REVIEW,
      category: args.category,
      description: args.description,
      foundAt: args.foundAt,
    });
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    source?: FindingSource;
    category?: string;
    description?: string;
    foundAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): QualityFinding {
    return new QualityFinding({
      ...args,
      source: args.source ?? FindingSource.REVIEW,
    });
  }
}
