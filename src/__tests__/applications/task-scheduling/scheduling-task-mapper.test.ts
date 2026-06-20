import { toSchedulingTask } from "@/applications/task-scheduling/scheduling-task-mapper";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import { WorkRecord } from "@/domains/work-records/work-recoed";
import { Assignee } from "@/domains/task/assignee";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

const yoteiPeriod = (start: Date, end: Date, kosu: number) =>
  Period.createFromDb({
    id: 1,
    startDate: start,
    endDate: end,
    type: new PeriodType({ type: "YOTEI" }),
    manHours: [
      ManHour.createFromDb({
        id: 1,
        kosu,
        type: new ManHourType({ type: "NORMAL" }),
      }),
    ],
  });

describe("toSchedulingTask", () => {
  test("YOTEI期間と予定工数を変換する", () => {
    const task = Task.createFromDb({
      id: 1,
      taskNo: TaskNo.reconstruct("T-0001"),
      wbsId: 1,
      name: "設計",
      status: new TaskStatus({ status: "NOT_STARTED" }),
      assigneeId: 5,
      periods: [yoteiPeriod(new Date(2026, 5, 15), new Date(2026, 5, 16), 16)],
    });
    const r = toSchedulingTask(task);
    expect(r.taskId).toBe(1);
    expect(r.taskNo).toBe("T-0001");
    expect(r.taskName).toBe("設計");
    expect(r.assigneeId).toBe(5);
    expect(r.status).toBe("NOT_STARTED");
    expect(r.yoteiStartDate).toEqual(new Date(2026, 5, 15));
    expect(r.yoteiEndDate).toEqual(new Date(2026, 5, 16));
    expect(r.yoteiKosu).toBe(16);
  });

  test("workRecordsから実績日程・工数を導出する(min開始/max終了/合計)", () => {
    const task = Task.createFromDb({
      id: 2,
      taskNo: TaskNo.reconstruct("T-0002"),
      wbsId: 1,
      name: "実装",
      status: new TaskStatus({ status: "IN_PROGRESS" }),
      workRecords: [
        WorkRecord.create({
          userId: "u1",
          taskId: 2,
          startDate: new Date(2026, 5, 10),
          endDate: new Date(2026, 5, 10),
          manHours: 8,
        }),
        WorkRecord.create({
          userId: "u1",
          taskId: 2,
          startDate: new Date(2026, 5, 12),
          endDate: new Date(2026, 5, 13),
          manHours: 16,
        }),
      ],
    });
    const r = toSchedulingTask(task);
    expect(r.jissekiStartDate).toEqual(new Date(2026, 5, 10));
    expect(r.jissekiEndDate).toEqual(new Date(2026, 5, 13));
    expect(r.jissekiKosu).toBe(24);
  });

  test("assigneeのdisplayNameを優先してassigneeNameにする", () => {
    const task = Task.createFromDb({
      id: 3,
      taskNo: TaskNo.reconstruct("T-0003"),
      wbsId: 1,
      name: "テスト",
      status: new TaskStatus({ status: "NOT_STARTED" }),
      assignee: Assignee.createFromDb({
        id: 5,
        name: "yamada",
        displayName: "山田太郎",
      }),
    });
    const r = toSchedulingTask(task);
    expect(r.assigneeName).toBe("山田太郎");
  });

  test("phaseのnameをphaseNameにする", () => {
    const task = Task.createFromDb({
      id: 4,
      taskNo: TaskNo.reconstruct("T-0004"),
      wbsId: 1,
      name: "結合",
      status: new TaskStatus({ status: "NOT_STARTED" }),
      phaseId: 9,
      phase: Phase.createFromDb({
        id: 9,
        name: "結合テスト",
        code: new PhaseCode("PH1"),
        seq: 1,
      }),
    });
    const r = toSchedulingTask(task);
    expect(r.phaseId).toBe(9);
    expect(r.phaseName).toBe("結合テスト");
  });

  test("期間・実績が無ければ各undefined", () => {
    const task = Task.createFromDb({
      id: 5,
      taskNo: TaskNo.reconstruct("T-0005"),
      wbsId: 1,
      name: "未設定",
      status: new TaskStatus({ status: "NOT_STARTED" }),
    });
    const r = toSchedulingTask(task);
    expect(r.yoteiStartDate).toBeUndefined();
    expect(r.yoteiKosu).toBeUndefined();
    expect(r.jissekiStartDate).toBeUndefined();
    expect(r.jissekiKosu).toBeUndefined();
  });
});
