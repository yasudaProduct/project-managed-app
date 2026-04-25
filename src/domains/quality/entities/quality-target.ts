export class QualityTarget {
  public readonly id?: number;
  public readonly wbsId: number;
  public readonly taskNo: string;
  public readonly name: string;
  public readonly subsystem?: string;
  public readonly featureGroup?: string;
  public readonly phaseCode?: string;
  public readonly assigneeId?: string;
  public isActive: boolean;

  private constructor(args: {
    id?: number;
    wbsId: number;
    taskNo: string;
    name: string;
    subsystem?: string;
    featureGroup?: string;
    phaseCode?: string;
    assigneeId?: string;
    isActive: boolean;
  }) {
    this.id = args.id;
    this.wbsId = args.wbsId;
    this.taskNo = args.taskNo;
    this.name = args.name;
    this.subsystem = args.subsystem;
    this.featureGroup = args.featureGroup;
    this.phaseCode = args.phaseCode;
    this.assigneeId = args.assigneeId;
    this.isActive = args.isActive;
  }

  public static create(args: {
    wbsId: number;
    taskNo: string;
    name: string;
    subsystem?: string;
    featureGroup?: string;
    phaseCode?: string;
    assigneeId?: string;
  }): QualityTarget {
    if (!args.wbsId) throw new Error('wbsIdは必須です');
    if (!args.taskNo) throw new Error('taskNoは必須です');
    if (!args.name) throw new Error('nameは必須です');

    return new QualityTarget({
      ...args,
      isActive: true,
    });
  }

  public static reconstruct(args: {
    id: number;
    wbsId: number;
    taskNo: string;
    name: string;
    subsystem?: string;
    featureGroup?: string;
    phaseCode?: string;
    assigneeId?: string;
    isActive: boolean;
  }): QualityTarget {
    return new QualityTarget(args);
  }

  public deactivate(): void {
    this.isActive = false;
  }
}
