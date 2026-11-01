import { MilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import type { IMilestoneRepository } from "@/applications/milestone/imilestone-repository";
import { Milestone } from "@/domains/milestone/milestone";
import type { ITaskRepository } from "@/applications/task/itask-repository";
import type { IEvmService } from "@/applications/evm/evm-service";
import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/task-status";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import type { TaskStatus as TaskStatusType } from "@/types/wbs";

describe("MilestoneApplicationService", () => {
  let milestoneRepository: jest.Mocked<IMilestoneRepository>;
  let taskRepository: { findActiveByWbsId: jest.Mock };
  let evmService: { getPhaseForecastDates: jest.Mock };
  let service: MilestoneApplicationService;

  beforeEach(() => {
    milestoneRepository = {
      findByWbsId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    taskRepository = { findActiveByWbsId: jest.fn().mockResolvedValue([]) };
    evmService = { getPhaseForecastDates: jest.fn().mockResolvedValue(new Map()) };

    service = new MilestoneApplicationService(
      milestoneRepository,
      taskRepository as unknown as ITaskRepository,
      evmService as unknown as IEvmService
    );
  });

  describe("getMilestones", () => {
    it("WBSに紐づくマイルストーン一覧を返すこと", async () => {
      milestoneRepository.findByWbsId.mockResolvedValue([
        Milestone.create({ id: 1, name: "リリース", date: new Date("2025-01-01") }),
      ]);

      const result = await service.getMilestones(10);

      expect(milestoneRepository.findByWbsId).toHaveBeenCalledWith(10);
      expect(result).toEqual([
        { id: 1, name: "リリース", date: new Date("2025-01-01") },
      ]);
    });
  });

  describe("createMilestone", () => {
    it("マイルストーンを作成すること", async () => {
      milestoneRepository.create.mockResolvedValue(
        Milestone.create({ id: 1, name: "リリース", date: new Date("2025-01-01") })
      );

      const result = await service.createMilestone({
        wbsId: 10,
        name: "リリース",
        date: new Date("2025-01-01"),
      });

      expect(milestoneRepository.create).toHaveBeenCalledWith(10, {
        name: "リリース",
        date: new Date("2025-01-01"),
      });
      expect(result).toEqual({ success: true, id: 1 });
    });
  });

  describe("updateMilestone", () => {
    it("マイルストーンを更新すること", async () => {
      milestoneRepository.update.mockResolvedValue(
        Milestone.create({ id: 1, name: "リリース(変更)", date: new Date("2025-02-01") })
      );

      const result = await service.updateMilestone({
        id: 1,
        name: "リリース(変更)",
        date: new Date("2025-02-01"),
      });

      expect(milestoneRepository.update).toHaveBeenCalledWith(1, {
        name: "リリース(変更)",
        date: new Date("2025-02-01"),
      });
      expect(result).toEqual({ success: true, id: 1 });
    });

    it("更新に失敗した場合、success: falseを返すこと", async () => {
      milestoneRepository.update.mockRejectedValue(new Error("not found"));

      const result = await service.updateMilestone({
        id: 999,
        name: "リリース",
        date: new Date("2025-01-01"),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("deleteMilestone", () => {
    it("マイルストーンを削除すること", async () => {
      milestoneRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteMilestone(1);

      expect(milestoneRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });

    it("削除に失敗した場合、success: falseを返すこと", async () => {
      milestoneRepository.delete.mockRejectedValue(new Error("not found"));

      const result = await service.deleteMilestone(999);

      expect(result.success).toBe(false);
    });
  });

  describe("対象（フェーズ完了型・タスク指定型）", () => {
    const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
    const makeTask = (id: number, status: TaskStatusType, end: string, phaseId?: number) =>
      Task.createFromDb({
        id,
        taskNo: TaskNo.reconstruct(`D1-000${id}`),
        wbsId: 10,
        name: `タスク${id}`,
        status: new TaskStatus({ status }),
        phaseId,
        periods: [
          Period.create({
            startDate: d("2026-10-01"),
            endDate: d(end),
            type: new PeriodType({ type: "YOTEI" }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: "NORMAL" }) })],
          }),
        ],
      });

    it("listMilestoneForecasts は対象ごとの達成見込みを返す", async () => {
      milestoneRepository.findByWbsId.mockResolvedValue([
        Milestone.create({ id: 1, name: "設計完了", date: d("2026-11-20"), target: { targetType: "PHASE", phaseId: 3 } }),
        Milestone.create({ id: 2, name: "中間リリース", date: d("2026-11-10"), target: { targetType: "TASKS", taskIds: [5, 99] } }),
        Milestone.create({ id: 3, name: "顧客レビュー", date: d("2026-10-31") }),
      ]);
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask(5, "IN_PROGRESS", "2026-11-15", 3),
        makeTask(6, "COMPLETED", "2026-10-20", 3),
      ]);
      evmService.getPhaseForecastDates.mockResolvedValue(new Map([[3, d("2026-11-25")]]));

      // JST 2026-11-01 12:00
      const result = await service.listMilestoneForecasts(10, new Date("2026-11-01T03:00:00.000Z"));

      expect(taskRepository.findActiveByWbsId).toHaveBeenCalledWith(10);
      expect(result).toEqual([
        {
          id: 3,
          name: "顧客レビュー",
          date: "2026-10-31T00:00:00.000Z",
          targetType: "EVENT",
          phaseId: null,
          taskIds: [],
          achievedAt: null,
          status: "OVERDUE",
          forecastDate: null,
          delayDays: 1,
          completedCount: 0,
          totalCount: 0,
          brokenLinkCount: 0,
        },
        expect.objectContaining({
          id: 2,
          targetType: "TASKS",
          taskIds: [5, 99],
          status: "AT_RISK",
          forecastDate: "2026-11-15T00:00:00.000Z",
          delayDays: 5,
          completedCount: 0,
          totalCount: 1,
          brokenLinkCount: 1,
        }),
        expect.objectContaining({
          id: 1,
          targetType: "PHASE",
          phaseId: 3,
          status: "AT_RISK",
          forecastDate: "2026-11-25T00:00:00.000Z",
          completedCount: 1,
          totalCount: 2,
        }),
      ]);
    });

    it("タスク指定型で対象タスクが空なら作成しない", async () => {
      const result = await service.createMilestone({
        wbsId: 10,
        name: "中間リリース",
        date: d("2026-12-01"),
        target: { targetType: "TASKS", taskIds: [] },
      });

      expect(result).toEqual({ success: false, error: "対象タスクを1件以上選択してください。" });
      expect(milestoneRepository.create).not.toHaveBeenCalled();
    });

    it("対象と達成日をリポジトリへ渡す", async () => {
      milestoneRepository.create.mockResolvedValue(
        Milestone.create({ id: 4, name: "設計完了", date: d("2026-11-30") })
      );

      await service.createMilestone({
        wbsId: 10,
        name: "設計完了",
        date: d("2026-11-30"),
        target: { targetType: "PHASE", phaseId: 3 },
        achievedAt: d("2026-11-28"),
      });

      expect(milestoneRepository.create).toHaveBeenCalledWith(10, {
        name: "設計完了",
        date: d("2026-11-30"),
        target: { targetType: "PHASE", phaseId: 3 },
        achievedAt: d("2026-11-28"),
      });
    });
  });
});
