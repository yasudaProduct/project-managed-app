import { TaskAllocation } from './task-allocation';

export class DailyWorkAllocation {
  public readonly date: Date;
  public readonly availableHours: number;
  public readonly taskAllocations: TaskAllocation[];

  private constructor(args: {
    date: Date;
    availableHours: number;
    taskAllocations: TaskAllocation[];
  }) {
    if (args.availableHours < 0) {
      throw new Error('稼働可能時間は0以上である必要があります');
    }

    this.date = args.date;
    this.availableHours = args.availableHours;
    this.taskAllocations = args.taskAllocations;
  }

  public static create(args: {
    date: Date;
    availableHours: number;
    taskAllocations: TaskAllocation[];
  }): DailyWorkAllocation {
    return new DailyWorkAllocation(args);
  }

  public get allocatedHours(): number {
    return this.taskAllocations.reduce((total, task) => total + task.allocatedHours, 0);
  }

  public isOverloaded(): boolean {
    return this.allocatedHours > this.availableHours;
  }

  public getUtilizationRate(): number {
    if (this.availableHours === 0) {
      return 0;
    }
    return this.allocatedHours / this.availableHours;
  }

  public getOverloadedHours(): number {
    const overload = this.allocatedHours - this.availableHours;
    return overload > 0 ? overload : 0;
  }

  public addTaskAllocation(taskAllocation: TaskAllocation): void {
    const existingIndex = this.taskAllocations.findIndex(task => 
      task.equals(taskAllocation)
    );

    if (existingIndex >= 0) {
      // 既存のタスクの工数を加算
      const existingTask = this.taskAllocations[existingIndex];
      const updatedTask = existingTask.addHours(taskAllocation.allocatedHours);
      this.taskAllocations[existingIndex] = updatedTask;
    } else {
      // 新しいタスクを追加
      this.taskAllocations.push(taskAllocation);
    }
  }
}