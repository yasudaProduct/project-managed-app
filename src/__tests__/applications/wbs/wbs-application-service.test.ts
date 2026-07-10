import { WbsApplicationService } from "@/applications/wbs/wbs-application-service";
import type { IWbsRepository } from "@/applications/wbs/iwbs-repository";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";
import type { IWbsBufferRepository } from "@/applications/wbs/iwbs-buffer-repository";
import type { IPhaseRepository } from "@/applications/task/iphase-repository";
import { WbsAssignee } from "@/domains/wbs/wbs-assignee";
import { Wbs } from "@/domains/wbs/wbs";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

describe("WbsApplicationService", () => {
  let wbsRepository: jest.Mocked<IWbsRepository>;
  let wbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
  let phaseRepository: jest.Mocked<IPhaseRepository>;
  let wbsBufferRepository: jest.Mocked<IWbsBufferRepository>;
  let service: WbsApplicationService;

  beforeEach(() => {
    wbsRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByProjectId: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    wbsAssigneeRepository = {
      findById: jest.fn(),
      findByWbsId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    phaseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      findByWbsId: jest.fn(),
      findPhasesUsedInWbs: jest.fn(),
      createTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    wbsBufferRepository = {
      findByWbsId: jest.fn(),
    };

    service = new WbsApplicationService(
      wbsRepository,
      wbsAssigneeRepository,
      phaseRepository,
      wbsBufferRepository
    );
  });

  describe("deleteAssignee", () => {
    it("存在する担当者IDの場合、削除して success: true を返すこと", async () => {
      const existing = WbsAssignee.createFromDb({
        id: 1,
        wbsId: 10,
        userId: "user-1",
        userName: "テスト太郎",
        rate: 1,
        costPerHour: 5000,
        seq: 0,
      });
      wbsAssigneeRepository.findById.mockResolvedValue(existing);
      wbsAssigneeRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteAssignee(1);

      expect(wbsAssigneeRepository.findById).toHaveBeenCalledWith(1);
      expect(wbsAssigneeRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true, id: 1 });
    });

    it("存在しない担当者IDの場合、success: false とエラーメッセージを返し、delete は呼ばれないこと", async () => {
      wbsAssigneeRepository.findById.mockResolvedValue(null);

      const result = await service.deleteAssignee(999);

      expect(wbsAssigneeRepository.findById).toHaveBeenCalledWith(999);
      expect(wbsAssigneeRepository.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe("getLatestWbsByProjectId", () => {
    it("プロジェクトに紐づくWBSのうち最新のものを返すこと", async () => {
      const wbsList = [
        Wbs.createFromDb({ id: 1, name: "WBS1", projectId: "p1" }),
        Wbs.createFromDb({ id: 2, name: "WBS2", projectId: "p1" }),
      ];
      wbsRepository.findByProjectId.mockResolvedValue(wbsList);

      const result = await service.getLatestWbsByProjectId("p1");

      expect(wbsRepository.findByProjectId).toHaveBeenCalledWith("p1");
      expect(result).toEqual({ id: 2, name: "WBS2", projectId: "p1" });
    });

    it("WBSが存在しない場合、nullを返すこと", async () => {
      wbsRepository.findByProjectId.mockResolvedValue([]);

      const result = await service.getLatestWbsByProjectId("p1");

      expect(result).toBeNull();
    });
  });

  describe("createWbsPhase", () => {
    it("同名のフェーズが存在しない場合、フェーズを作成すること", async () => {
      phaseRepository.findByWbsId.mockResolvedValue([]);
      phaseRepository.create.mockResolvedValue(
        Phase.createFromDb({ id: 5, name: "設計", code: new PhaseCode("D1"), seq: 1 })
      );

      const result = await service.createWbsPhase({
        wbsId: 10,
        name: "設計",
        code: "D1",
        seq: 1,
      });

      expect(phaseRepository.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true, id: 5 });
    });

    it("同名のフェーズが存在する場合、success: falseを返すこと", async () => {
      phaseRepository.findByWbsId.mockResolvedValue([
        Phase.createFromDb({ id: 1, name: "設計", code: new PhaseCode("D1"), seq: 1 }),
      ]);

      const result = await service.createWbsPhase({
        wbsId: 10,
        name: "設計",
        code: "D2",
        seq: 2,
      });

      expect(phaseRepository.create).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe("createAssignee", () => {
    it("未追加の担当者の場合、担当者を追加すること", async () => {
      wbsAssigneeRepository.findByWbsId.mockResolvedValue([]);
      wbsAssigneeRepository.create.mockResolvedValue(
        WbsAssignee.createFromDb({
          id: 1,
          wbsId: 10,
          userId: "user-1",
          userName: "テスト太郎",
          rate: 0.5,
          costPerHour: 5000,
          seq: 0,
        })
      );

      const result = await service.createAssignee({
        wbsId: 10,
        assigneeId: "user-1",
        rate: 0.5,
        costPerHour: 5000,
        seq: 0,
      });

      expect(wbsAssigneeRepository.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true, id: 1 });
    });

    it("既に追加済みの担当者の場合、success: falseを返すこと", async () => {
      wbsAssigneeRepository.findByWbsId.mockResolvedValue([
        WbsAssignee.createFromDb({
          id: 1,
          wbsId: 10,
          userId: "user-1",
          userName: "テスト太郎",
          rate: 1,
          costPerHour: 5000,
          seq: 0,
        }),
      ]);

      const result = await service.createAssignee({
        wbsId: 10,
        assigneeId: "user-1",
        rate: 0.5,
        costPerHour: 5000,
        seq: 0,
      });

      expect(wbsAssigneeRepository.create).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe("updateAssignee", () => {
    it("存在する担当者の場合、更新すること", async () => {
      const existing = WbsAssignee.createFromDb({
        id: 1,
        wbsId: 10,
        userId: "user-1",
        userName: "テスト太郎",
        rate: 0.5,
        costPerHour: 5000,
        seq: 0,
      });
      wbsAssigneeRepository.findById.mockResolvedValue(existing);
      wbsAssigneeRepository.update.mockResolvedValue(
        WbsAssignee.createFromDb({
          id: 1,
          wbsId: 10,
          userId: "user-2",
          userName: "テスト次郎",
          rate: 0.8,
          costPerHour: 6000,
          seq: 1,
        })
      );

      const result = await service.updateAssignee({
        id: 1,
        assigneeId: "user-2",
        rate: 0.8,
        costPerHour: 6000,
        seq: 1,
      });

      expect(wbsAssigneeRepository.update).toHaveBeenCalled();
      expect(result).toEqual({ success: true, id: 1 });
    });

    it("存在しない担当者の場合、success: falseを返すこと", async () => {
      wbsAssigneeRepository.findById.mockResolvedValue(null);

      const result = await service.updateAssignee({
        id: 999,
        assigneeId: "user-2",
        rate: 0.8,
        costPerHour: 6000,
        seq: 1,
      });

      expect(wbsAssigneeRepository.update).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe("getBuffers", () => {
    it("WBSに紐づくバッファ一覧を返すこと", async () => {
      wbsBufferRepository.findByWbsId.mockResolvedValue([
        { id: 1, wbsId: 10, name: "リスクバッファ", buffer: 5, bufferType: "RISK" },
      ]);

      const result = await service.getBuffers(10);

      expect(wbsBufferRepository.findByWbsId).toHaveBeenCalledWith(10);
      expect(result).toEqual([
        { id: 1, wbsId: 10, name: "リスクバッファ", buffer: 5, bufferType: "RISK" },
      ]);
    });
  });
});
