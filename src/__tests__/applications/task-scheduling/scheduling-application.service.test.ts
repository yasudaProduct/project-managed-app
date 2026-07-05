import { SchedulingApplicationService } from "@/applications/task-scheduling/scheduling-application-service";
import { Task } from "@/domains/task/task";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/task-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import { WorkRecord } from "@/domains/work-record/work-record";
import { createDefaultSystemSettings } from "@/__tests__/helpers/system-settings-helper";
import { DEFAULT_SCHEDULING_SETTINGS } from "@/types/scheduling-settings";
import type { TaskStatus as TaskStatusType } from "@/types/wbs";

const PROJECT_START = new Date(2026, 5, 15); // 月曜

const yoteiTask = (
  id: number,
  taskNo: string,
  assigneeId: number | undefined,
  start: Date,
  end: Date,
  kosu: number,
  status: TaskStatusType = "NOT_STARTED",
  name = `タスク${id}`
) =>
  Task.createFromDb({
    id,
    taskNo: TaskNo.reconstruct(taskNo),
    wbsId: 1,
    name,
    status: new TaskStatus({ status }),
    assigneeId,
    periods: [
      Period.createFromDb({
        id,
        startDate: start,
        endDate: end,
        type: new PeriodType({ type: "YOTEI" }),
        manHours: [
          ManHour.createFromDb({
            id,
            kosu,
            type: new ManHourType({ type: "NORMAL" }),
          }),
        ],
      }),
    ],
  });

const mockAssignee = (id: number, userId: string, name: string) =>
  WbsAssignee.createFromDb({
    id,
    wbsId: 1,
    userId,
    userName: name,
    rate: 1.0,
    costPerHour: 5000,
    seq: id,
  });

describe("SchedulingApplicationService", () => {
  let wbsRepo: { findById: jest.Mock };
  let projectRepo: { findById: jest.Mock };
  let taskRepo: { findActiveByWbsId: jest.Mock };
  let depRepo: { findByWbsId: jest.Mock };
  let assigneeRepo: { findByWbsId: jest.Mock };
  let scheduleRepo: { findByUsersAndDateRange: jest.Mock };
  let holidayRepo: { findByDateRange: jest.Mock };
  let sysRepo: { get: jest.Mock };
  let schedSettingsRepo: { getByProjectId: jest.Mock };
  let service: SchedulingApplicationService;

  beforeEach(() => {
    wbsRepo = { findById: jest.fn().mockResolvedValue({ projectId: "p1" }) };
    projectRepo = {
      findById: jest.fn().mockResolvedValue({ startDate: PROJECT_START }),
    };
    taskRepo = { findActiveByWbsId: jest.fn().mockResolvedValue([]) };
    depRepo = { findByWbsId: jest.fn().mockResolvedValue([]) };
    assigneeRepo = { findByWbsId: jest.fn().mockResolvedValue([]) };
    scheduleRepo = {
      findByUsersAndDateRange: jest.fn().mockResolvedValue([]),
    };
    holidayRepo = { findByDateRange: jest.fn().mockResolvedValue([]) };
    sysRepo = { get: jest.fn().mockResolvedValue(createDefaultSystemSettings()) };
    schedSettingsRepo = {
      getByProjectId: jest
        .fn()
        .mockResolvedValue({ ...DEFAULT_SCHEDULING_SETTINGS }),
    };

    service = new SchedulingApplicationService(
      wbsRepo as never,
      projectRepo as never,
      taskRepo as never,
      depRepo as never,
      assigneeRepo as never,
      scheduleRepo as never,
      holidayRepo as never,
      sysRepo as never,
      schedSettingsRepo as never
    );
  });

  test("正常系: タスクがDTO化されTSV・基準日・負荷を返す", async () => {
    taskRepo.findActiveByWbsId.mockResolvedValue([
      yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 8),
      yoteiTask(2, "T-0002", 10, PROJECT_START, new Date(2026, 5, 16), 8),
    ]);
    assigneeRepo.findByWbsId.mockResolvedValue([mockAssignee(10, "u1", "山田")]);

    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });

    expect(result.scheduledTasks).toHaveLength(2);
    expect(result.scheduledTasks[0].scheduledStartDate).toBeDefined();
    expect(typeof result.tsv).toBe("string");
    expect(result.tsv).toContain("タスクNo");
    expect(result.baselineDate).toBe(PROJECT_START.toISOString());
    expect(result.workloads).toHaveLength(1);
  });

  test("基準日 TODAY は今日0時、CUSTOM は指定ISO", async () => {
    const today = await service.calculateSchedule(1, { baselineMode: "TODAY" });
    const now = new Date();
    expect(today.baselineDate).toBe(
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    );

    const custom = await service.calculateSchedule(1, {
      baselineMode: "CUSTOM",
      baselineDateIso: "2026-03-02T00:00:00.000Z",
    });
    expect(custom.baselineDate).toBe("2026-03-02T00:00:00.000Z");
  });

  test("WBS未存在でthrow", async () => {
    wbsRepo.findById.mockResolvedValue(null);
    await expect(
      service.calculateSchedule(1, { baselineMode: "PROJECT_START" })
    ).rejects.toThrow("WBS");
  });

  test("プロジェクト基準開始日なしでthrow", async () => {
    projectRepo.findById.mockResolvedValue({ startDate: null });
    await expect(
      service.calculateSchedule(1, { baselineMode: "PROJECT_START" })
    ).rejects.toThrow("基準開始日");
  });

  test("担当者未設定タスクはskip+警告", async () => {
    taskRepo.findActiveByWbsId.mockResolvedValue([
      yoteiTask(1, "T-0001", undefined, PROJECT_START, new Date(2026, 5, 16), 8),
    ]);
    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });
    expect(result.scheduledTasks[0].skipped).toBe(true);
    expect(result.scheduledTasks[0].note).toBe("NO_ASSIGNEE");
    expect(result.warnings.some((w) => w.kind === "NO_ASSIGNEE")).toBe(true);
  });

  test("完了タスクは実績で固定(fixed)", async () => {
    const t = Task.createFromDb({
      id: 1,
      taskNo: TaskNo.reconstruct("T-0001"),
      wbsId: 1,
      name: "完了タスク",
      status: new TaskStatus({ status: "COMPLETED" }),
      assigneeId: 10,
      periods: [
        Period.createFromDb({
          id: 1,
          startDate: PROJECT_START,
          endDate: new Date(2026, 5, 16),
          type: new PeriodType({ type: "YOTEI" }),
          manHours: [
            ManHour.createFromDb({
              id: 1,
              kosu: 8,
              type: new ManHourType({ type: "NORMAL" }),
            }),
          ],
        }),
      ],
      workRecords: [
        WorkRecord.create({
          userId: "u1",
          taskId: 1,
          startDate: new Date(2026, 5, 10),
          endDate: new Date(2026, 5, 11),
          manHours: 8,
        }),
      ],
    });
    taskRepo.findActiveByWbsId.mockResolvedValue([t]);
    assigneeRepo.findByWbsId.mockResolvedValue([mockAssignee(10, "u1", "山田")]);

    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });
    expect(result.scheduledTasks[0].fixed).toBe(true);
    expect(result.scheduledTasks[0].note).toBe("COMPLETED_FIXED");
  });

  test("定常設定キーワードに一致するタスクは定常扱い", async () => {
    schedSettingsRepo.getByProjectId.mockResolvedValue({
      ...DEFAULT_SCHEDULING_SETTINGS,
      steadyTaskKeywords: ["管理"],
    });
    taskRepo.findActiveByWbsId.mockResolvedValue([
      yoteiTask(
        1,
        "T-0001",
        10,
        PROJECT_START,
        new Date(2026, 5, 19),
        20,
        "NOT_STARTED",
        "プロジェクト管理"
      ),
    ]);
    assigneeRepo.findByWbsId.mockResolvedValue([mockAssignee(10, "u1", "山田")]);

    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });
    expect(result.scheduledTasks[0].isSteady).toBe(true);
    expect(result.scheduledTasks[0].note).toBe("STEADY_FIXED_PERIOD");
  });
});
