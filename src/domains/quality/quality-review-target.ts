import { QualityDocumentType, QualityReviewType } from './value-objects/quality-enums';

export class QualityReviewTarget {
  public readonly id?: number;
  public readonly wbsId: number;
  public readonly taskNo: string;
  public readonly name: string;
  public readonly documentType: QualityDocumentType;
  public readonly reviewType: QualityReviewType;
  public isActive: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    wbsId: number;
    taskNo: string;
    name: string;
    documentType: QualityDocumentType;
    reviewType: QualityReviewType;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.wbsId = args.wbsId;
    this.taskNo = args.taskNo;
    this.name = args.name;
    this.documentType = args.documentType;
    this.reviewType = args.reviewType;
    this.isActive = args.isActive;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    wbsId: number;
    taskNo: string;
    name: string;
    documentType?: QualityDocumentType;
    reviewType?: QualityReviewType;
  }): QualityReviewTarget {
    if (!args.wbsId) throw new Error('wbsIdは必須です');
    if (!args.taskNo) throw new Error('taskNoは必須です');
    if (!args.name) throw new Error('nameは必須です');

    return new QualityReviewTarget({
      wbsId: args.wbsId,
      taskNo: args.taskNo,
      name: args.name,
      documentType: args.documentType ?? QualityDocumentType.OTHER,
      reviewType: args.reviewType ?? QualityReviewType.PEER,
      isActive: true,
    });
  }

  public static reconstruct(args: {
    id: number;
    wbsId: number;
    taskNo: string;
    name: string;
    documentType: QualityDocumentType;
    reviewType: QualityReviewType;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): QualityReviewTarget {
    return new QualityReviewTarget(args);
  }

  public deactivate(): void {
    this.isActive = false;
  }
}
