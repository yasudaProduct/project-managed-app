import { ProjectSettingsRepository } from "@/infrastructures/project-settings/project-settings-repository";
import type { PrismaClient } from "@prisma/client";

describe("ProjectSettingsRepository", () => {
  let prismaMock: {
    projectSettings: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let repository: ProjectSettingsRepository;

  const dbRow = {
    projectId: "p1",
    roundToQuarter: true,
    progressMeasurementMethod: "ZERO_HUNDRED",
    forecastCalculationMethod: "CONSERVATIVE",
    evmForecastMethod: "CPI_SPI",
    deadlineAlertDays: 3,
    costOverrunThresholdPct: 120,
    evmExcludeSettings: {},
    schedulingSettings: {
      steadyTaskKeywords: ["定例"],
      consumeSteadyTaskCapacity: true,
      steadyDailyHoursMode: "FIXED",
    },
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  };

  beforeEach(() => {
    prismaMock = {
      projectSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new ProjectSettingsRepository(
      prismaMock as unknown as PrismaClient
    );
  });

  describe("findByProjectId", () => {
    it("存在するprojectIdの場合、ProjectSettingsDataを返すこと", async () => {
      prismaMock.projectSettings.findUnique.mockResolvedValue(dbRow);

      const result = await repository.findByProjectId("p1");

      expect(prismaMock.projectSettings.findUnique).toHaveBeenCalledWith({
        where: { projectId: "p1" },
      });
      expect(result).toEqual({
        projectId: "p1",
        roundToQuarter: true,
        progressMeasurementMethod: "ZERO_HUNDRED",
        forecastCalculationMethod: "CONSERVATIVE",
        evmForecastMethod: "CPI_SPI",
        deadlineAlertDays: 3,
        costOverrunThresholdPct: 120,
      });
    });

    it("存在しない場合、nullを返すこと", async () => {
      prismaMock.projectSettings.findUnique.mockResolvedValue(null);

      const result = await repository.findByProjectId("unknown");

      expect(result).toBeNull();
    });
  });

  describe("upsertProjectSettings", () => {
    it("指定フィールドでupsertすること", async () => {
      prismaMock.projectSettings.upsert.mockResolvedValue(dbRow);

      await repository.upsertProjectSettings("p1", {
        roundToQuarter: true,
        progressMeasurementMethod: "ZERO_HUNDRED",
        forecastCalculationMethod: "CONSERVATIVE",
        evmForecastMethod: "CPI_SPI",
      });

      expect(prismaMock.projectSettings.upsert).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        create: {
          projectId: "p1",
          roundToQuarter: true,
          progressMeasurementMethod: "ZERO_HUNDRED",
          forecastCalculationMethod: "CONSERVATIVE",
          evmForecastMethod: "CPI_SPI",
        },
        update: {
          roundToQuarter: true,
          progressMeasurementMethod: "ZERO_HUNDRED",
          forecastCalculationMethod: "CONSERVATIVE",
          evmForecastMethod: "CPI_SPI",
        },
      });
    });

    it("省略フィールドはupdate句に含めないこと", async () => {
      prismaMock.projectSettings.upsert.mockResolvedValue(dbRow);

      await repository.upsertProjectSettings("p1", {
        roundToQuarter: false,
      });

      expect(prismaMock.projectSettings.upsert).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        create: {
          projectId: "p1",
          roundToQuarter: false,
          progressMeasurementMethod: "SELF_REPORTED",
          forecastCalculationMethod: "REALISTIC",
          evmForecastMethod: "CPI_ONLY",
        },
        update: {
          roundToQuarter: false,
        },
      });
    });
  });

  describe("upsertDashboardSettings", () => {
    it("期限アラート日数と超過閾値をupsertすること", async () => {
      prismaMock.projectSettings.upsert.mockResolvedValue(dbRow);

      await repository.upsertDashboardSettings("p1", {
        deadlineAlertDays: 5,
        costOverrunThresholdPct: 150,
      });

      expect(prismaMock.projectSettings.upsert).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        create: {
          projectId: "p1",
          deadlineAlertDays: 5,
          costOverrunThresholdPct: 150,
        },
        update: {
          deadlineAlertDays: 5,
          costOverrunThresholdPct: 150,
        },
      });
    });
  });

  describe("findSchedulingSettings", () => {
    it("schedulingSettings列を正規化して返すこと", async () => {
      prismaMock.projectSettings.findUnique.mockResolvedValue(dbRow);

      const result = await repository.findSchedulingSettings("p1");

      expect(result).toEqual({
        steadyTaskKeywords: ["定例"],
        consumeSteadyTaskCapacity: true,
        steadyDailyHoursMode: "FIXED",
        steadyTaskForecastMode: "PLANNED",
      });
    });

    it("レコードが存在しない場合、デフォルト値を返すこと", async () => {
      prismaMock.projectSettings.findUnique.mockResolvedValue(null);

      const result = await repository.findSchedulingSettings("unknown");

      expect(result).toEqual({
        steadyTaskKeywords: [],
        consumeSteadyTaskCapacity: false,
        steadyDailyHoursMode: "PRORATE",
        steadyTaskForecastMode: "PLANNED",
      });
    });
  });

  describe("upsertSchedulingSettings", () => {
    it("schedulingSettings列をupsertすること", async () => {
      prismaMock.projectSettings.upsert.mockResolvedValue(dbRow);

      const settings = {
        steadyTaskKeywords: ["定例"],
        consumeSteadyTaskCapacity: true,
        steadyDailyHoursMode: "FIXED" as const,
        steadyTaskForecastMode: "PLANNED" as const,
      };

      await repository.upsertSchedulingSettings("p1", settings);

      expect(prismaMock.projectSettings.upsert).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        create: { projectId: "p1", schedulingSettings: settings },
        update: { schedulingSettings: settings },
      });
    });
  });
});
