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
import type { ScheduledTaskDto } from "@/applications/task-scheduling/ischeduling-application-service";
import { DailyWorkAllocation } from "@/domains/assignee-workload/daily-work-allocation";
import { TaskAllocation } from "@/domains/assignee-workload/task-allocation";
import type { LabeledAllocationSet } from "@/domains/assignee-workload/workload-merge-service";

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

const mockAssignee = (id: number, userId: string, name: string, rate = 1.0) =>
  WbsAssignee.createFromDb({
    id,
    wbsId: 1,
    userId,
    userName: name,
    rate,
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
  let crossWbsService: { getExternalAllocationSets: jest.Mock };
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
    crossWbsService = {
      getExternalAllocationSets: jest.fn().mockResolvedValue(new Map()),
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
      schedSettingsRepo as never,
      crossWbsService as never
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

  test("プロジェクト終了日を超えるタスクにEXCEEDS_PROJECT_END警告", async () => {
    projectRepo.findById.mockResolvedValue({
      startDate: PROJECT_START,
      endDate: new Date(2026, 5, 16),
    });
    // 40h / 7.5h日 → 6稼働日 → 06-22 終了で 06-16 を超過
    taskRepo.findActiveByWbsId.mockResolvedValue([
      yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 40),
    ]);
    assigneeRepo.findByWbsId.mockResolvedValue([mockAssignee(10, "u1", "山田")]);

    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });
    expect(
      result.warnings.some(
        (w) => w.kind === "EXCEEDS_PROJECT_END" && w.taskNo === "T-0001"
      )
    ).toBe(true);
  });

  test("プロジェクト終了日以内なら超過警告なし", async () => {
    projectRepo.findById.mockResolvedValue({
      startDate: PROJECT_START,
      endDate: new Date(2026, 5, 30),
    });
    taskRepo.findActiveByWbsId.mockResolvedValue([
      yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 8),
    ]);
    assigneeRepo.findByWbsId.mockResolvedValue([mockAssignee(10, "u1", "山田")]);

    const result = await service.calculateSchedule(1, {
      baselineMode: "PROJECT_START",
    });
    expect(result.warnings.some((w) => w.kind === "EXCEEDS_PROJECT_END")).toBe(
      false
    );
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

  describe("他WBS負荷の考慮(considerOtherWbsLoad)", () => {
    // userId → 1セット(他PJのある日の負荷)の外部配分マップを作る
    const externalSets = (
      userId: string,
      date: Date,
      hours: number,
      projectName = "他PJ"
    ): Map<string, LabeledAllocationSet[]> =>
      new Map([
        [
          userId,
          [
            {
              wbsId: 99,
              projectId: "p2",
              projectName,
              dailyAllocations: [
                DailyWorkAllocation.create({
                  date,
                  availableHours: 7.5,
                  taskAllocations: [
                    TaskAllocation.create({
                      taskId: "900",
                      taskName: "他PJタスク",
                      allocatedHours: hours,
                      totalHours: hours,
                    }),
                  ],
                }),
              ],
            },
          ],
        ],
      ]);

    test("既定(省略=ON): 他WBS負荷が先行消費されタスクが後ろ倒しになる", async () => {
      taskRepo.findActiveByWbsId.mockResolvedValue([
        yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 7.5),
      ]);
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);
      // 基準日(06-15 月)を他PJが丸ごと占有
      crossWbsService.getExternalAllocationSets.mockResolvedValue(
        externalSets("u1", PROJECT_START, 7.5)
      );

      const result = await service.calculateSchedule(1, {
        baselineMode: "PROJECT_START",
      });

      // 現プロジェクト除外・現WBS担当者のユーザーに限定して外部負荷を取得する
      expect(crossWbsService.getExternalAllocationSets).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ["u1"],
          excludeProjectId: "p1",
        })
      );

      // 06-15 は外部負荷で満杯 → タスクは 06-16 開始
      expect(result.scheduledTasks[0].scheduledStartDate).toBe(
        new Date(2026, 5, 16).toISOString()
      );

      // プレビュー負荷は合算行(rate=1)で、外部配分がプロジェクト名付きで含まれる
      const wl = result.workloads.find((w) => w.assigneeId === "u1")!;
      expect(wl.assigneeRate).toBe(1);
      const externalDay = wl.dailyAllocations.find((d) =>
        d.date.startsWith("2026-06-15")
      )!;
      expect(externalDay.allocatedHours).toBeCloseTo(7.5, 5);
      expect(externalDay.taskAllocations[0].projectName).toBe("他PJ");
      const ownDay = wl.dailyAllocations.find((d) =>
        d.date.startsWith("2026-06-16")
      )!;
      expect(ownDay.allocatedHours).toBeCloseTo(7.5, 5);
      expect(ownDay.taskAllocations[0].projectName).toBeUndefined();
    });

    test("参画率0.5の担当者は外部負荷があっても取り分(標準×率)まで前詰めできる", async () => {
      taskRepo.findActiveByWbsId.mockResolvedValue([
        yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 7.5),
      ]);
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田", 0.5), // 取り分3.75h/日
      ]);
      // 他PJが基準日(06-15)に3.75h → 参画率外の枠に収まるため取り分は削られない
      crossWbsService.getExternalAllocationSets.mockResolvedValue(
        externalSets("u1", PROJECT_START, 3.75)
      );

      const result = await service.calculateSchedule(1, {
        baselineMode: "PROJECT_START",
      });

      // available = min(標準×率, 物理残−外部) = min(3.75, 7.5−3.75) = 3.75h/日
      // → 7.5h は 06-15(3.75)+06-16(3.75) で消化(旧実装だと06-15が0になり06-16開始)
      expect(result.scheduledTasks[0].scheduledStartDate).toBe(
        PROJECT_START.toISOString()
      );
      expect(result.scheduledTasks[0].scheduledEndDate).toBe(
        new Date(2026, 5, 16).toISOString()
      );
    });

    test("外部負荷が物理残を圧迫する場合は残量までしか使えない", async () => {
      taskRepo.findActiveByWbsId.mockResolvedValue([
        yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 2.5),
      ]);
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田", 0.5),
      ]);
      // 他PJが5h → 物理残2.5h(< 取り分3.75h)
      crossWbsService.getExternalAllocationSets.mockResolvedValue(
        externalSets("u1", PROJECT_START, 5)
      );

      const result = await service.calculateSchedule(1, {
        baselineMode: "PROJECT_START",
      });

      // 06-15 の残量2.5hで2.5hのタスクがちょうど収まる
      expect(result.scheduledTasks[0].scheduledStartDate).toBe(
        PROJECT_START.toISOString()
      );
      expect(result.scheduledTasks[0].scheduledEndDate).toBe(
        PROJECT_START.toISOString()
      );
    });

    test("considerOtherWbsLoad: false は外部負荷を参照せず従来通り", async () => {
      taskRepo.findActiveByWbsId.mockResolvedValue([
        yoteiTask(1, "T-0001", 10, PROJECT_START, new Date(2026, 5, 16), 7.5),
      ]);
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);

      const result = await service.calculateSchedule(1, {
        baselineMode: "PROJECT_START",
        considerOtherWbsLoad: false,
      });

      expect(crossWbsService.getExternalAllocationSets).not.toHaveBeenCalled();
      expect(result.scheduledTasks[0].scheduledStartDate).toBe(
        PROJECT_START.toISOString()
      );
    });
  });

  describe("recalculatePreview（手動調整後の再計算）", () => {
    const editedDto = (over: Partial<ScheduledTaskDto>): ScheduledTaskDto => ({
      taskId: 1,
      taskNo: "T-0001",
      taskName: "タスク1",
      status: "NOT_STARTED",
      isSteady: false,
      fixed: false,
      skipped: false,
      note: "NORMAL",
      predecessors: [],
      assigneeId: 10,
      assigneeName: "山田",
      scheduledStartDate: "2026-06-17T00:00:00.000Z",
      scheduledEndDate: "2026-06-17T00:00:00.000Z",
      scheduledManHours: 6,
      ...over,
    });

    test("編集後の日付で負荷・TSVを再計算し、タスク再スケジュールは行わない", async () => {
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);

      const res = await service.recalculatePreview(1, {
        baselineDateIso: PROJECT_START.toISOString(),
        scheduledTasks: [editedDto({})],
      });

      // タスクの読み直し（再スケジュール）はしない
      expect(taskRepo.findActiveByWbsId).not.toHaveBeenCalled();

      // TSVに編集後の日付が反映される
      expect(res.tsv).toContain("2026/06/17");

      // 編集後の日に負荷が配分される
      const wl = res.workloads.find((w) => w.assigneeId === "u1")!;
      const day = wl.dailyAllocations.find((d) =>
        d.date.startsWith("2026-06-17")
      );
      expect(day?.allocatedHours).toBe(6);
    });

    test("編集後の終了日がプロジェクト終了日を超えたら警告を返す", async () => {
      projectRepo.findById.mockResolvedValue({
        startDate: PROJECT_START,
        endDate: new Date(2026, 5, 16),
      });
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);

      const res = await service.recalculatePreview(1, {
        baselineDateIso: PROJECT_START.toISOString(),
        scheduledTasks: [editedDto({})],
      });
      expect(
        res.warnings.some(
          (w) => w.kind === "EXCEEDS_PROJECT_END" && w.taskNo === "T-0001"
        )
      ).toBe(true);
    });

    test("編集後の終了日がプロジェクト終了日以内なら警告なし", async () => {
      projectRepo.findById.mockResolvedValue({
        startDate: PROJECT_START,
        endDate: new Date(2026, 5, 30),
      });
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);

      const res = await service.recalculatePreview(1, {
        baselineDateIso: PROJECT_START.toISOString(),
        scheduledTasks: [editedDto({})],
      });
      expect(res.warnings).toEqual([]);
    });

    test("既定(省略=ON): 外部負荷がプレビューへ合算される", async () => {
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);
      // 編集後タスクと同じ 06-17 に他PJ 2h
      crossWbsService.getExternalAllocationSets.mockResolvedValue(
        new Map([
          [
            "u1",
            [
              {
                wbsId: 99,
                projectId: "p2",
                projectName: "他PJ",
                dailyAllocations: [
                  DailyWorkAllocation.create({
                    date: new Date(2026, 5, 17),
                    availableHours: 7.5,
                    taskAllocations: [
                      TaskAllocation.create({
                        taskId: "900",
                        taskName: "他PJタスク",
                        allocatedHours: 2,
                        totalHours: 2,
                      }),
                    ],
                  }),
                ],
              },
            ] as LabeledAllocationSet[],
          ],
        ])
      );

      const res = await service.recalculatePreview(1, {
        baselineDateIso: PROJECT_START.toISOString(),
        scheduledTasks: [editedDto({})],
      });

      expect(crossWbsService.getExternalAllocationSets).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ["u1"],
          excludeProjectId: "p1",
        })
      );
      const wl = res.workloads.find((w) => w.assigneeId === "u1")!;
      expect(wl.assigneeRate).toBe(1);
      const day = wl.dailyAllocations.find((d) =>
        d.date.startsWith("2026-06-17")
      )!;
      // 編集後タスク6h + 他PJ 2h
      expect(day.allocatedHours).toBeCloseTo(8, 5);
      expect(
        day.taskAllocations.some((t) => t.projectName === "他PJ")
      ).toBe(true);
    });

    test("considerOtherWbsLoad: false は外部負荷を参照しない", async () => {
      assigneeRepo.findByWbsId.mockResolvedValue([
        mockAssignee(10, "u1", "山田"),
      ]);

      const res = await service.recalculatePreview(1, {
        baselineDateIso: PROJECT_START.toISOString(),
        scheduledTasks: [editedDto({})],
        considerOtherWbsLoad: false,
      });

      expect(crossWbsService.getExternalAllocationSets).not.toHaveBeenCalled();
      const wl = res.workloads.find((w) => w.assigneeId === "u1")!;
      const day = wl.dailyAllocations.find((d) =>
        d.date.startsWith("2026-06-17")
      );
      expect(day?.allocatedHours).toBe(6);
    });
  });
});
