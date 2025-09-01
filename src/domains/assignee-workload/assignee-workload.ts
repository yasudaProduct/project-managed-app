import { DailyWorkAllocation } from './daily-work-allocation';

export class AssigneeWorkload {
  public readonly assigneeId: string;
  public readonly assigneeName: string;
  public readonly dailyAllocations: DailyWorkAllocation[];

  private constructor(args: {
    assigneeId: string;
    assigneeName: string;
    dailyAllocations: DailyWorkAllocation[];
  }) {
    this.assigneeId = args.assigneeId;
    this.assigneeName = args.assigneeName;
    this.dailyAllocations = args.dailyAllocations;
  }

  public static create(args: {
    assigneeId: string;
    assigneeName: string;
    dailyAllocations: DailyWorkAllocation[];
  }): AssigneeWorkload {
    return new AssigneeWorkload(args);
  }

  public getOverloadedDays(): DailyWorkAllocation[] {
    return this.dailyAllocations.filter(allocation => allocation.isOverloaded());
  }

  public getTotalHours(startDate: Date, endDate: Date): number {
    return this.dailyAllocations
      .filter(allocation => {
        const allocationDate = allocation.date;
        return allocationDate >= startDate && allocationDate <= endDate;
      })
      .reduce((total, allocation) => total + allocation.allocatedHours, 0);
  }

  public getDailyAllocation(date: Date): DailyWorkAllocation | undefined {
    return this.dailyAllocations.find(allocation => 
      allocation.date.toDateString() === date.toDateString()
    );
  }

  public getDateRange(): { startDate: Date | null; endDate: Date | null } {
    if (this.dailyAllocations.length === 0) {
      return { startDate: null, endDate: null };
    }

    const dates = this.dailyAllocations.map(allocation => allocation.date);
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());

    return {
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1]
    };
  }
}