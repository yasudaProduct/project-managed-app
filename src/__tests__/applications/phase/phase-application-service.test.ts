import { PhaseApplicationService } from "@/applications/phase/phase-application-service";
import type { IPhaseRepository } from "@/applications/task/iphase-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

describe("PhaseApplicationService", () => {
  let phaseRepository: jest.Mocked<IPhaseRepository>;
  let service: PhaseApplicationService;

  beforeEach(() => {
    phaseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      findByWbsId: jest.fn(),
      findPhasesUsedInWbs: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service = new PhaseApplicationService(phaseRepository);
  });

  describe("getPhaseTemplateById", () => {
    it("存在するIDの工程テンプレートを返すこと", async () => {
      phaseRepository.findTemplateById.mockResolvedValue(
        Phase.createFromDb({ id: 1, name: "設計", code: new PhaseCode("D1"), seq: 1 })
      );

      const result = await service.getPhaseTemplateById(1);

      expect(phaseRepository.findTemplateById).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, name: "設計", seq: 1, code: "D1" });
    });

    it("存在しない場合はnullを返すこと", async () => {
      phaseRepository.findTemplateById.mockResolvedValue(null);

      const result = await service.getPhaseTemplateById(999);

      expect(result).toBeNull();
    });
  });

  describe("deletePhaseTemplate", () => {
    it("工程テンプレートを削除すること", async () => {
      phaseRepository.deleteTemplate.mockResolvedValue(undefined);

      const result = await service.deletePhaseTemplate(1);

      expect(phaseRepository.deleteTemplate).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });

    it("削除に失敗した場合、success: falseを返すこと", async () => {
      phaseRepository.deleteTemplate.mockRejectedValue(new Error("not found"));

      const result = await service.deletePhaseTemplate(999);

      expect(result.success).toBe(false);
    });
  });

  describe("getPhasesByWbsId", () => {
    it("WBSに紐づくフェーズ一覧を返すこと", async () => {
      phaseRepository.findByWbsId.mockResolvedValue([
        Phase.createFromDb({ id: 1, name: "設計", code: new PhaseCode("D1"), seq: 1 }),
      ]);

      const result = await service.getPhasesByWbsId(10);

      expect(phaseRepository.findByWbsId).toHaveBeenCalledWith(10);
      expect(result).toEqual([
        { id: 1, name: "設計", code: "D1", seq: 1, wbsId: 10 },
      ]);
    });
  });

  describe("updateWbsPhase", () => {
    it("WBSフェーズを更新すること", async () => {
      phaseRepository.findById.mockResolvedValue(
        Phase.createFromDb({ id: 1, name: "設計", code: new PhaseCode("D1"), seq: 1 })
      );
      phaseRepository.update.mockResolvedValue(
        Phase.createFromDb({ id: 1, name: "設計(変更)", code: new PhaseCode("D2"), seq: 2 })
      );

      const result = await service.updateWbsPhase({
        id: 1,
        wbsId: 10,
        name: "設計(変更)",
        code: "D2",
        seq: 2,
      });

      expect(phaseRepository.update).toHaveBeenCalledWith(10, "1", expect.any(Phase));
      expect(result).toEqual({
        success: true,
        phase: { id: 1, name: "設計(変更)", code: "D2", seq: 2, wbsId: 10 },
      });
    });

    it("存在しない場合、success: falseを返すこと", async () => {
      phaseRepository.findById.mockResolvedValue(null);

      const result = await service.updateWbsPhase({ id: 999, wbsId: 10, name: "設計" });

      expect(result.success).toBe(false);
    });
  });

  describe("deleteWbsPhase", () => {
    it("WBSフェーズを削除すること", async () => {
      phaseRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteWbsPhase(1);

      expect(phaseRepository.delete).toHaveBeenCalledWith("1");
      expect(result).toEqual({ success: true });
    });

    it("削除に失敗した場合、success: falseを返すこと", async () => {
      phaseRepository.delete.mockRejectedValue(new Error("failed"));

      const result = await service.deleteWbsPhase(999);

      expect(result.success).toBe(false);
    });
  });
});
