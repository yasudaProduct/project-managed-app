export class TaskAllocation {
  public readonly taskId: string;
  public readonly taskName: string;
  public readonly allocatedHours: number;
  public readonly totalHours: number;
  public readonly periodStart?: Date;
  public readonly periodEnd?: Date;
  public readonly projectName?: string; // 他WBS合算時の所属プロジェクト表示用ラベル

  private constructor(args: {
    taskId: string;
    taskName: string;
    allocatedHours: number;
    totalHours: number;
    periodStart?: Date;
    periodEnd?: Date;
    projectName?: string;
  }) {
    if (args.allocatedHours < 0) {
      throw new Error('配分工数は0以上である必要があります');
    }

    this.taskId = args.taskId;
    this.taskName = args.taskName;
    this.allocatedHours = args.allocatedHours;
    this.totalHours = args.totalHours;
    this.periodStart = args.periodStart;
    this.periodEnd = args.periodEnd;
    this.projectName = args.projectName;
  }

  public static create(args: {
    taskId: string;
    taskName: string;
    allocatedHours: number;
    totalHours: number;
    periodStart?: Date;
    periodEnd?: Date;
    projectName?: string;
  }): TaskAllocation {
    return new TaskAllocation(args);
  }

  public getFormattedHours(): string {
    return this.allocatedHours.toFixed(1);
  }

  public equals(other: TaskAllocation): boolean {
    return this.taskId === other.taskId;
  }

  public addHours(hours: number): TaskAllocation {
    return TaskAllocation.create({
      taskId: this.taskId,
      taskName: this.taskName,
      allocatedHours: this.allocatedHours + hours,
      totalHours: this.totalHours,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      projectName: this.projectName
    });
  }
}
