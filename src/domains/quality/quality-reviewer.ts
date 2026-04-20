export class QualityReviewer {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly reviewerUserId: string;
  public readonly reviewTaskNo: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.reviewerUserId = args.reviewerUserId;
    this.reviewTaskNo = args.reviewTaskNo;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
  }): QualityReviewer {
    return new QualityReviewer(args);
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): QualityReviewer {
    return new QualityReviewer(args);
  }
}
