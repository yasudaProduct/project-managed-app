export class QualityReviewer {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly reviewerUserId: string;
  public readonly reviewTaskNo: string;
  public readonly reviewHours?: number;

  private constructor(args: {
    id?: number;
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
    reviewHours?: number;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.reviewerUserId = args.reviewerUserId;
    this.reviewTaskNo = args.reviewTaskNo;
    this.reviewHours = args.reviewHours;
  }

  public static create(args: {
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
    reviewHours?: number;
  }): QualityReviewer {
    if (args.reviewHours !== undefined && args.reviewHours < 0) {
      throw new Error('reviewHoursは0以上である必要があります');
    }

    return new QualityReviewer(args);
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    reviewerUserId: string;
    reviewTaskNo: string;
    reviewHours?: number;
  }): QualityReviewer {
    return new QualityReviewer(args);
  }
}
