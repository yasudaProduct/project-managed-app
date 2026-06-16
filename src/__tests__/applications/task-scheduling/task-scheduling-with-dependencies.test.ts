import { TaskSchedulingApplicationService } from "@/applications/task-scheduling/task-scheduling-application.service";
import type { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import type { ISystemSettingsRepository } from "@/applications/system-settings/isystem-settings-repository";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
import type { IMilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import { Assignee } from "@/domains/task/assignee";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { TaskDependency } from "@/domains/task-dependency/task-dependency";
import type { TaskStatus as TaskStatusType } from "@/types/wbs";

const fmt = (date?: Date) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getDate()).padStart(2, "0")}`
    : undefined;

// 指定タイプの期間を作る（SCHEDULE では開始終了は無視されるが、固定/締切判定では使う）
const periodOf = (
  type: "YOTEI" | "KIJUN",
  kosu: number,
  start: Date,
  end: Date,
) =>
  Period.create({
    startDate: start,
    endDate: end,
    type: new PeriodType({ type }),
    manHours: [
      ManHour.create({ kosu, type: new ManHourType({ type: "NORMAL" }) }),
    ],
  });

const makeTask = (
  id: number,
  taskNo: string,
  assigneeId: number | undefined,
  kosu: number,
  status: TaskStatusType = "NOT_STARTED",
  opts?: {
    progressRate?: number;
    yoteiStart?: Date;
    yoteiEnd?: Date;
    kijunStart?: Date;
    kijunEnd?: Date;
  },
) =>
  Task.createFromDb({
    id,
    taskNo: TaskNo.reconstruct(taskNo),
    wbsId: 1,
    name: `task${id}`,
    status: new TaskStatus({ status }),
    assigneeId,
    assignee: assigneeId
      ? Assignee.createFromDb({
          id: assigneeId,
          name: `u${assigneeId}`,
          displayName: `User${assigneeId}`,
        })
      : undefined,
    phaseId: 10,
    periods: [
      periodOf(
        "YOTEI",
        kosu,
        opts?.yoteiStart ?? new Date(2024, 0, 1),
        opts?.yoteiEnd ?? new Date(2024, 0, 1),
      ),
      ...(opts?.kijunEnd
        ? [
            periodOf(
              "KIJUN",
              kosu,
              opts?.kijunStart ?? opts.kijunEnd,
              opts.kijunEnd,
            ),
          ]
        : []),
    ],
    progressRate: opts?.progressRate,
  });

describe("TaskSchedulingApplicationService.calculateWbsTaskSchedulesWithDependencies", () => {
  let service: TaskSchedulingApplicationService;
  let findByIdWbs: jest.Mock;
  let findByIdProject: jest.Mock;
  let findByWbsIdTask: jest.Mock;
  let getDependencies: jest.Mock;
  let getSettings: jest.Mock;
  let findAllHolidays: jest.Mock;
  let findByIdAssignee: jest.Mock;
  let findByUserId: jest.Mock;
  let getMilestones: jest.Mock;

  beforeEach(() => {
    findByIdWbs = jest.fn().mockResolvedValue({ id: 1, projectId: "p1" });
    findByIdProject = jest.fn().mockResolvedValue({
      id: "p1",
      startDate: new Date(2024, 0, 10),
      endDate: new Date(2024, 11, 31),
    });
    findByWbsIdTask = jest.fn().mockResolvedValue([]);
    getDependencies = jest.fn().mockResolvedValue([]);
    getSettings = jest.fn().mockResolvedValue({ standardWorkingHours: 8 });
    findAllHolidays = jest.fn().mockResolvedValue([]);
    findByIdAssignee = jest.fn().mockImplementation((id: number) =>
      Promise.resolve(
        WbsAssignee.createFromDb({
          id,
          wbsId: 1,
          userId: `u${id}`,
          userName: `User${id}`,
          rate: 1.0,
          costPerHour: 5000,
          seq: id,
        }),
      ),
    );
    findByUserId = jest.fn().mockResolvedValue([]);
    getMilestones = jest.fn().mockResolvedValue([]);

    const wbsRepo = { findById: findByIdWbs } as unknown as IWbsRepository;
    const taskRepo = {
      findByWbsId: findByWbsIdTask,
    } as unknown as ITaskRepository;
    const projectRepo = {
      findById: findByIdProject,
    } as unknown as IProjectRepository;
    const userScheduleRepo = {
      findByUserId,
    } as unknown as IUserScheduleRepository;
    const wbsAssigneeRepo = {
      findById: findByIdAssignee,
    } as unknown as IWbsAssigneeRepository;
    const settingsRepo = {
      get: getSettings,
    } as unknown as ISystemSettingsRepository;
    const depService = {
      getDependenciesByWbsId: getDependencies,
    } as unknown as TaskDependencyService;
    const holidayRepo = {
      findAll: findAllHolidays,
    } as unknown as ICompanyHolidayRepository;
    const milestoneService = {
      getMilestones,
    } as unknown as IMilestoneApplicationService;

    service = new TaskSchedulingApplicationService(
      wbsRepo,
      taskRepo,
      projectRepo,
      userScheduleRepo,
      wbsAssigneeRepo,
      settingsRepo,
      depService,
      holidayRepo,
      milestoneService,
    );
  });

  test("明示アンカー日 + FS依存: 後続が先行終了の翌稼働日に並び、DTOが埋まる", async () => {
    findByWbsIdTask.mockResolvedValue([
      makeTask(1, "A-001", 1, 8),
      makeTask(2, "A-002", 2, 8),
    ]);
    getDependencies.mockResolvedValue([
      TaskDependency.createFromDb({
        id: 100,
        predecessorTaskId: 1,
        successorTaskId: 2,
        wbsId: 1,
        type: "FS",
        lag: 0,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1),
      }),
    ]);

    // 2024-01-10(水)を起点
    const results = await service.calculateWbsTaskSchedulesWithDependencies(
      1,
      new Date(2024, 0, 10),
    );

    const a = results.find((r) => r.taskId === 1)!;
    const b = results.find((r) => r.taskId === 2)!;

    expect(fmt(a.plannedStartDate)).toBe("2024-01-10");
    expect(fmt(a.plannedEndDate)).toBe("2024-01-10");
    // 先行終了1/10 → 翌稼働日1/11
    expect(fmt(b.plannedStartDate)).toBe("2024-01-11");

    // DTO 拡張フィールド
    expect(a.status).toBe("NOT_STARTED");
    expect(a.assigneeSeq).toBe(1);
    expect(a.assigneeName).toBe("User1");
    expect(a.phaseId).toBe(10);
    expect(a.hasAssignee).toBe(true);
    expect(b.predecessors).toEqual([{ taskId: 1, type: "FS", lag: 0 }]);

    // 会社休日リポジトリが呼ばれている（旧バグ=未注入の回帰防止）
    expect(findAllHolidays).toHaveBeenCalled();
  });

  test("アンカー日省略時はプロジェクト開始日を起点にする", async () => {
    findByIdProject.mockResolvedValue({
      id: "p1",
      startDate: new Date(2024, 0, 12), // 金曜
    });
    findByWbsIdTask.mockResolvedValue([makeTask(1, "A-001", 1, 8)]);

    const results = await service.calculateWbsTaskSchedulesWithDependencies(1);

    expect(fmt(results[0].plannedStartDate)).toBe("2024-01-12");
  });

  test("担当者未設定タスクはエラーDTOになる", async () => {
    findByWbsIdTask.mockResolvedValue([makeTask(1, "A-001", undefined, 8)]);

    const results = await service.calculateWbsTaskSchedulesWithDependencies(
      1,
      new Date(2024, 0, 10),
    );

    expect(results[0].hasAssignee).toBe(false);
    expect(results[0].errorMessage).toBe("担当者が設定されていません");
    expect(results[0].plannedStartDate).toBeUndefined();
  });

  test("プロジェクト開始日が無ければエラーを投げる", async () => {
    findByIdProject.mockResolvedValue({ id: "p1", startDate: undefined });

    await expect(
      service.calculateWbsTaskSchedulesWithDependencies(1),
    ).rejects.toThrow("プロジェクトの基準開始日が設定されていません");
  });

  test("リスケモード: 完了は固定・着手中は終了再計算・未着手は前詰め", async () => {
    findByWbsIdTask.mockResolvedValue([
      // 完了: 予定1/2-1/3（実績なし→予定で固定）
      makeTask(1, "A-001", 1, 8, "COMPLETED", {
        yoteiStart: new Date(2024, 0, 2),
        yoteiEnd: new Date(2024, 0, 3),
      }),
      // 着手中: 予定開始1/8・工数16h・進捗50% → 残8h
      makeTask(2, "A-002", 2, 16, "IN_PROGRESS", {
        progressRate: 50,
        yoteiStart: new Date(2024, 0, 8),
        yoteiEnd: new Date(2024, 0, 9),
      }),
      // 未着手
      makeTask(3, "A-003", 3, 8, "NOT_STARTED"),
    ]);

    // 起点=1/10(水)
    const results = await service.calculateWbsTaskSchedulesWithDependencies(
      1,
      new Date(2024, 0, 10),
      "reschedule",
    );
    const a = results.find((r) => r.taskId === 1)!;
    const b = results.find((r) => r.taskId === 2)!;
    const c = results.find((r) => r.taskId === 3)!;

    // 完了: 予定で固定（再計算しない）
    expect(fmt(a.plannedStartDate)).toBe("2024-01-02");
    expect(fmt(a.plannedEndDate)).toBe("2024-01-03");
    expect(a.schedulingKind).toBe("fixed");

    // 着手中: 開始=予定開始(1/8)固定、終了=1/10から残8h消化=1/10
    expect(fmt(b.plannedStartDate)).toBe("2024-01-08");
    expect(fmt(b.plannedEndDate)).toBe("2024-01-10");
    expect(b.schedulingKind).toBe("partial");

    // 未着手: 起点(1/10)から前詰め
    expect(fmt(c.plannedStartDate)).toBe("2024-01-10");
    expect(c.schedulingKind).toBe("scheduled");
  });

  test("計画モードでは完了タスクも起点から再計算される", async () => {
    findByWbsIdTask.mockResolvedValue([
      makeTask(1, "A-001", 1, 8, "COMPLETED", {
        yoteiStart: new Date(2024, 0, 2),
        yoteiEnd: new Date(2024, 0, 3),
      }),
    ]);

    const results = await service.calculateWbsTaskSchedulesWithDependencies(
      1,
      new Date(2024, 0, 10),
      "plan",
    );

    // plan: 実績/完了を無視して 1/10 から
    expect(fmt(results[0].plannedStartDate)).toBe("2024-01-10");
    expect(results[0].schedulingKind).toBe("scheduled");
  });

  test("締切超過と差分: 基準/プロジェクト終了/マイルストーンの超過と現行予定差分", async () => {
    // 現行予定 6/1-6/5、基準終了 6/5 のタスクを 6/10 起点で算出（=6/10終了）
    findByWbsIdTask.mockResolvedValue([
      makeTask(1, "A-001", 1, 8, "NOT_STARTED", {
        yoteiStart: new Date(2024, 5, 1),
        yoteiEnd: new Date(2024, 5, 5),
        kijunEnd: new Date(2024, 5, 5),
      }),
    ]);
    findByIdProject.mockResolvedValue({
      id: "p1",
      startDate: new Date(2024, 5, 1),
      endDate: new Date(2024, 5, 8), // 6/8
    });
    getMilestones.mockResolvedValue([
      { id: 1, name: "結合試験", date: new Date(2024, 5, 7) }, // 6/7（committed 6/5 <= 6/7 < 6/10）
    ]);

    const results = await service.calculateWbsTaskSchedulesWithDependencies(
      1,
      new Date(2024, 5, 10), // 6/10(月)
      "plan",
    );
    const a = results[0];

    expect(fmt(a.plannedEndDate)).toBe("2024-06-10");
    // 現行予定終了 6/5 → 算出 6/10：終了差分 +5
    expect(a.endDiffDays).toBe(5);
    // 基準終了 6/5 超過 +5
    expect(a.baselineEndDiffDays).toBe(5);
    // プロジェクト終了 6/8 超過 +2
    expect(a.projectEndDiffDays).toBe(2);
    // マイルストーン 6/7 に未達
    expect(a.missedMilestones?.map((m) => m.name)).toEqual(["結合試験"]);
  });
});
