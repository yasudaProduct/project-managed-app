import { TaskSchedulingApplicationService } from "@/applications/task-scheduling/task-scheduling-application.service";
import type { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import type { IProjectRepository } from "@/applications/projects/iproject-repository";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import type { ISystemSettingsRepository } from "@/applications/system-settings/isystem-settings-repository";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import { TaskDependencyService } from "@/applications/task-dependency/task-dependency.service";
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

// 予定(YOTEI)期間（工数のみ使う。開始終了はスケジューラが無視するのでダミー）
const yoteiPeriod = (kosu: number) =>
  Period.create({
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 0, 1),
    type: new PeriodType({ type: "YOTEI" }),
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
    periods: [yoteiPeriod(kosu)],
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

  beforeEach(() => {
    findByIdWbs = jest.fn().mockResolvedValue({ id: 1, projectId: "p1" });
    findByIdProject = jest
      .fn()
      .mockResolvedValue({ id: "p1", startDate: new Date(2024, 0, 10) });
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

    service = new TaskSchedulingApplicationService(
      wbsRepo,
      taskRepo,
      projectRepo,
      userScheduleRepo,
      wbsAssigneeRepo,
      settingsRepo,
      depService,
      holidayRepo,
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
});
