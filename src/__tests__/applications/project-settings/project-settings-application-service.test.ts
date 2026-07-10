import { ProjectSettingsApplicationService } from "@/applications/project-settings/project-settings-application-service";
import type { IProjectSettingsRepository } from "@/applications/project-settings/iproject-settings-repository";
import { DEFAULT_PROJECT_SETTINGS } from "@/types/project-settings";
import { DEFAULT_SCHEDULING_SETTINGS } from "@/types/scheduling-settings";

describe("ProjectSettingsApplicationService", () => {
  let repository: jest.Mocked<IProjectSettingsRepository>;
  let service: ProjectSettingsApplicationService;

  beforeEach(() => {
    repository = {
      findByProjectId: jest.fn(),
      upsertProjectSettings: jest.fn(),
      upsertDashboardSettings: jest.fn(),
      upsertEvmSettings: jest.fn(),
      findSchedulingSettings: jest.fn(),
      upsertSchedulingSettings: jest.fn(),
    };
    service = new ProjectSettingsApplicationService(repository);
  });

  describe("getProjectSettings", () => {
    it("設定が存在する場合、そのまま返すこと", async () => {
      const settings = {
        projectId: "p1",
        roundToQuarter: true,
        progressMeasurementMethod: "ZERO_HUNDRED" as const,
        forecastCalculationMethod: "CONSERVATIVE" as const,
        evmForecastMethod: "CPI_SPI" as const,
        evmBufferCostMethod: "AVERAGE_RATE" as const,
        evmPvDistribution: "CALENDAR" as const,
        evmHealthyThresholdPct: 90,
        evmWarningThresholdPct: 80,
        deadlineAlertDays: 3,
        costOverrunThresholdPct: 120,
      };
      repository.findByProjectId.mockResolvedValue(settings);

      const result = await service.getProjectSettings("p1");

      expect(result).toEqual(settings);
    });

    it("設定が存在しない場合、デフォルト値を返すこと", async () => {
      repository.findByProjectId.mockResolvedValue(null);

      const result = await service.getProjectSettings("p1");

      expect(result).toEqual({ projectId: "p1", ...DEFAULT_PROJECT_SETTINGS });
    });
  });

  describe("updateProjectSettings", () => {
    it("正常に更新できた場合、success: trueを返すこと", async () => {
      repository.upsertProjectSettings.mockResolvedValue(undefined);

      const result = await service.updateProjectSettings("p1", true, "ZERO_HUNDRED");

      expect(repository.upsertProjectSettings).toHaveBeenCalledWith("p1", {
        roundToQuarter: true,
        progressMeasurementMethod: "ZERO_HUNDRED",
        forecastCalculationMethod: undefined,
        evmForecastMethod: undefined,
      });
      expect(result).toEqual({ success: true, data: undefined });
    });

    it("projectIdが空の場合、success: falseを返しリポジトリを呼ばないこと", async () => {
      const result = await service.updateProjectSettings("", true);

      expect(result).toEqual({ success: false, error: "projectIdは必須です。" });
      expect(repository.upsertProjectSettings).not.toHaveBeenCalled();
    });
  });

  describe("updateDashboardSettings", () => {
    it("正常に更新できた場合、success: trueを返すこと", async () => {
      const result = await service.updateDashboardSettings("p1", 5, 150);

      expect(repository.upsertDashboardSettings).toHaveBeenCalledWith("p1", {
        deadlineAlertDays: 5,
        costOverrunThresholdPct: 150,
      });
      expect(result).toEqual({ success: true, data: undefined });
    });
  });

  describe("updateEvmSettings", () => {
    it("正常に更新できた場合、success: trueを返すこと", async () => {
      const result = await service.updateEvmSettings("p1", {
        evmBufferCostMethod: "DEFAULT_RATE",
        evmPvDistribution: "BUSINESS_DAYS",
        evmHealthyThresholdPct: 95,
        evmWarningThresholdPct: 85,
      });

      expect(repository.upsertEvmSettings).toHaveBeenCalledWith("p1", {
        evmBufferCostMethod: "DEFAULT_RATE",
        evmPvDistribution: "BUSINESS_DAYS",
        evmHealthyThresholdPct: 95,
        evmWarningThresholdPct: 85,
      });
      expect(result).toEqual({ success: true, data: undefined });
    });

    it("warningしきい値がhealthyしきい値を上回る場合、success: falseを返すこと", async () => {
      const result = await service.updateEvmSettings("p1", {
        evmHealthyThresholdPct: 80,
        evmWarningThresholdPct: 90,
      });

      expect(result.success).toBe(false);
      expect(repository.upsertEvmSettings).not.toHaveBeenCalled();
    });
  });

  describe("getSchedulingSettings", () => {
    it("リポジトリの結果をそのまま返すこと", async () => {
      repository.findSchedulingSettings.mockResolvedValue(DEFAULT_SCHEDULING_SETTINGS);

      const result = await service.getSchedulingSettings("p1");

      expect(result).toEqual(DEFAULT_SCHEDULING_SETTINGS);
    });
  });

  describe("updateSchedulingSettings", () => {
    it("正常に更新できた場合、success: trueを返すこと", async () => {
      const result = await service.updateSchedulingSettings("p1", DEFAULT_SCHEDULING_SETTINGS);

      expect(repository.upsertSchedulingSettings).toHaveBeenCalledWith(
        "p1",
        DEFAULT_SCHEDULING_SETTINGS
      );
      expect(result).toEqual({ success: true, data: undefined });
    });
  });

  describe("getProgressMeasurementMethod", () => {
    it("設定が存在する場合、その進捗測定方式を返すこと", async () => {
      repository.findByProjectId.mockResolvedValue({
        projectId: "p1",
        roundToQuarter: false,
        progressMeasurementMethod: "FIFTY_FIFTY",
        forecastCalculationMethod: "REALISTIC",
        evmForecastMethod: "CPI_ONLY",
        evmBufferCostMethod: "AVERAGE_RATE",
        evmPvDistribution: "CALENDAR",
        evmHealthyThresholdPct: 90,
        evmWarningThresholdPct: 80,
        deadlineAlertDays: 1,
        costOverrunThresholdPct: 100,
      });

      const result = await service.getProgressMeasurementMethod("p1");

      expect(result).toBe("FIFTY_FIFTY");
    });

    it("設定が存在しない場合、SELF_REPORTEDを返すこと", async () => {
      repository.findByProjectId.mockResolvedValue(null);

      const result = await service.getProgressMeasurementMethod("p1");

      expect(result).toBe("SELF_REPORTED");
    });
  });
});
