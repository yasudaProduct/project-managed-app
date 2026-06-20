import {
  WorkloadCalculationService,
  type ScheduleAllocationInput,
} from "@/domains/assignee-workload/workload-calculation.service";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";

describe("WorkloadCalculationService.calculateDailyAllocationsFromSchedule", () => {
  const service = new WorkloadCalculationService();
  const makeAssignee = () =>
    WbsAssignee.create({ wbsId: 1, userId: "u1", rate: 1.0 });
  const companyCalendar = new CompanyCalendar(8); // 標準8h、会社休日なし

  test("単一タスクを期間内の各稼働日に按分する", () => {
    const items: ScheduleAllocationInput[] = [
      {
        taskId: "1",
        taskName: "A",
        start: new Date(2026, 5, 15),
        end: new Date(2026, 5, 16),
        hours: 16,
      },
    ];
    const result = service.calculateDailyAllocationsFromSchedule(
      items,
      makeAssignee(),
      [],
      companyCalendar,
      new Date(2026, 5, 15),
      new Date(2026, 5, 16)
    );
    const d15 = result.find((d) => d.date.getDate() === 15)!;
    const d16 = result.find((d) => d.date.getDate() === 16)!;
    expect(d15.allocatedHours).toBeCloseTo(8);
    expect(d16.allocatedHours).toBeCloseTo(8);
  });

  test("期間外の日には配分しない", () => {
    const items: ScheduleAllocationInput[] = [
      {
        taskId: "1",
        taskName: "A",
        start: new Date(2026, 5, 16),
        end: new Date(2026, 5, 16),
        hours: 8,
      },
    ];
    const result = service.calculateDailyAllocationsFromSchedule(
      items,
      makeAssignee(),
      [],
      companyCalendar,
      new Date(2026, 5, 15),
      new Date(2026, 5, 17)
    );
    expect(result.find((d) => d.date.getDate() === 15)!.allocatedHours).toBeCloseTo(0);
    expect(result.find((d) => d.date.getDate() === 16)!.allocatedHours).toBeCloseTo(8);
  });

  test("複数タスクが同日に重なると過負荷になりうる", () => {
    const items: ScheduleAllocationInput[] = [
      {
        taskId: "1",
        taskName: "A",
        start: new Date(2026, 5, 15),
        end: new Date(2026, 5, 15),
        hours: 8,
      },
      {
        taskId: "2",
        taskName: "B",
        start: new Date(2026, 5, 15),
        end: new Date(2026, 5, 15),
        hours: 8,
      },
    ];
    const result = service.calculateDailyAllocationsFromSchedule(
      items,
      makeAssignee(),
      [],
      companyCalendar,
      new Date(2026, 5, 15),
      new Date(2026, 5, 15)
    );
    const d15 = result.find((d) => d.date.getDate() === 15)!;
    expect(d15.allocatedHours).toBeCloseTo(16);
    expect(d15.availableHours).toBeCloseTo(8);
  });
});
