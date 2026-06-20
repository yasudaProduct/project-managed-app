import { convertScheduledTasksToTsv } from "@/applications/task-scheduling/tsv-converter";
import type { ScheduledTask } from "@/domains/task-scheduling/scheduled-result";

const base = (over: Partial<ScheduledTask>): ScheduledTask => ({
  taskId: 1,
  taskNo: "0001",
  taskName: "A",
  status: "NOT_STARTED",
  isSteady: false,
  fixed: false,
  skipped: false,
  note: "NORMAL",
  predecessors: [],
  ...over,
});

describe("convertScheduledTasksToTsv", () => {
  test("ヘッダー行を含む", () => {
    const tsv = convertScheduledTasksToTsv([]);
    expect(tsv.split("\n")[0]).toContain("タスクNo");
  });

  test("タスク行を出力する", () => {
    const tsv = convertScheduledTasksToTsv([
      base({
        taskNo: "0001",
        taskName: "設計",
        assigneeName: "山田",
        scheduledStartDate: new Date(2026, 5, 15),
        scheduledEndDate: new Date(2026, 5, 16),
        scheduledManHours: 16,
      }),
    ]);
    const row = tsv.split("\n")[1].split("\t");
    expect(row[0]).toBe("0001");
    expect(row[1]).toBe("設計");
    expect(row[2]).toBe("山田");
    expect(row[6]).toBe("2026/06/15");
    expect(row[7]).toBe("2026/06/16");
    expect(row[8]).toBe("16");
  });

  test("定常タスクはマークを付ける", () => {
    const tsv = convertScheduledTasksToTsv([
      base({ isSteady: true, note: "STEADY_FIXED_PERIOD" }),
    ]);
    const row = tsv.split("\n")[1].split("\t");
    expect(row[5]).toBe("○");
  });
});
