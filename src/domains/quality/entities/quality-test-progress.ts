export class QualityTestProgress {
  public readonly id?: number;
  public readonly targetId: number;
  public readonly date: Date;
  public readonly plannedTotal: number;
  public readonly executedTotal: number;
  public readonly passedTotal: number;
  public readonly failedTotal: number;
  public readonly blockedTotal: number;

  private constructor(args: {
    id?: number;
    targetId: number;
    date: Date;
    plannedTotal: number;
    executedTotal: number;
    passedTotal: number;
    failedTotal: number;
    blockedTotal: number;
  }) {
    this.id = args.id;
    this.targetId = args.targetId;
    this.date = args.date;
    this.plannedTotal = args.plannedTotal;
    this.executedTotal = args.executedTotal;
    this.passedTotal = args.passedTotal;
    this.failedTotal = args.failedTotal;
    this.blockedTotal = args.blockedTotal;
  }

  public get remainingCount(): number {
    return this.plannedTotal - this.executedTotal;
  }

  public static create(args: {
    targetId: number;
    date: Date;
    plannedTotal: number;
    executedTotal: number;
    passedTotal: number;
    failedTotal: number;
    blockedTotal: number;
  }): QualityTestProgress {
    const values = [
      args.plannedTotal,
      args.executedTotal,
      args.passedTotal,
      args.failedTotal,
      args.blockedTotal,
    ];
    if (values.some((v) => v < 0)) {
      throw new Error('テスト進捗の値は0以上である必要があります');
    }
    if (args.executedTotal > args.plannedTotal) {
      throw new Error('消化累計がテスト項目総数を超えています');
    }

    return new QualityTestProgress(args);
  }

  public static reconstruct(args: {
    id: number;
    targetId: number;
    date: Date;
    plannedTotal: number;
    executedTotal: number;
    passedTotal: number;
    failedTotal: number;
    blockedTotal: number;
  }): QualityTestProgress {
    return new QualityTestProgress(args);
  }
}
