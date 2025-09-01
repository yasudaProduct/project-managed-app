export class TaskAllocation {
  public readonly taskId: string;
  public readonly taskName: string;
  public readonly allocatedHours: number;

  private constructor(args: {
    taskId: string;
    taskName: string;
    allocatedHours: number;
  }) {
    if (args.allocatedHours < 0) {
      throw new Error('配分工数は0以上である必要があります');
    }

    this.taskId = args.taskId;
    this.taskName = args.taskName;
    this.allocatedHours = args.allocatedHours;
  }

  public static create(args: {
    taskId: string;
    taskName: string;
    allocatedHours: number;
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
      allocatedHours: this.allocatedHours + hours
    });
  }
}