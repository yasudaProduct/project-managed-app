import { MilestoneApplicationService } from "@/applications/milestone/milestone-application-service";
import type { IMilestoneRepository } from "@/applications/milestone/milestone.interfase";
import { Milestone } from "@/domains/milestone/milestone";

describe("MilestoneApplicationService", () => {
  let milestoneRepository: jest.Mocked<IMilestoneRepository>;
  let service: MilestoneApplicationService;

  beforeEach(() => {
    milestoneRepository = {
      findByWbsId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service = new MilestoneApplicationService(milestoneRepository);
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
});
