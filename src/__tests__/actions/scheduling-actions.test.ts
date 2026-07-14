/**
 * @jest-environment node
 */

// Prismaモジュールをモック化（インポート前にモックする必要がある）
jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {},
}));

// DIコンテナのモック
jest.mock("@/lib/inversify.config", () => ({
  container: {
    get: jest.fn(),
  },
}));

import {
  calculateSchedule,
  recalculateSchedulePreview,
} from "@/components/task-scheduling/scheduling-actions";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type {
  ScheduleCalculationParams,
  ScheduleCalculationResult,
  SchedulePreviewRecalcParams,
  SchedulePreviewRecalcResult,
} from "@/applications/task-scheduling/ischeduling-application-service";

describe("scheduling-actions", () => {
  const mockService = {
    calculateSchedule: jest.fn(),
    recalculatePreview: jest.fn(),
  };

  beforeEach(() => {
    (container.get as jest.Mock).mockReset();
    (container.get as jest.Mock).mockReturnValue(mockService);
    mockService.calculateSchedule.mockReset();
    mockService.recalculatePreview.mockReset();
  });

  describe("calculateSchedule", () => {
    it("DIコンテナからISchedulingApplicationServiceを取得しcalculateScheduleへ委譲する", async () => {
      const params: ScheduleCalculationParams = { baselineMode: "TODAY" };
      const serviceResult: ScheduleCalculationResult = {
        baselineDate: "2026-06-15T00:00:00.000Z",
        warnings: [],
        scheduledTasks: [],
        workloads: [],
        tsv: "",
      };
      mockService.calculateSchedule.mockResolvedValue(serviceResult);

      const result = await calculateSchedule(1, params);

      expect(container.get).toHaveBeenCalledWith(
        SYMBOL.ISchedulingApplicationService
      );
      expect(mockService.calculateSchedule).toHaveBeenCalledWith(1, params);
      expect(result).toBe(serviceResult);
    });

    it("CUSTOM基準日を指定した場合もそのままパラメータを引き渡す", async () => {
      const params: ScheduleCalculationParams = {
        baselineMode: "CUSTOM",
        baselineDateIso: "2026-07-01T00:00:00.000Z",
      };
      mockService.calculateSchedule.mockResolvedValue({
        baselineDate: params.baselineDateIso,
        warnings: [],
        scheduledTasks: [],
        workloads: [],
        tsv: "",
      });

      await calculateSchedule(42, params);

      expect(mockService.calculateSchedule).toHaveBeenCalledWith(42, params);
    });

    it("サービスがエラーを投げた場合はそのまま呼び出し元に伝播する(try/catchでもみ消さない)", async () => {
      mockService.calculateSchedule.mockRejectedValue(
        new Error("WBSに紐づくプロジェクトが見つかりません")
      );

      await expect(
        calculateSchedule(1, { baselineMode: "TODAY" })
      ).rejects.toThrow("WBSに紐づくプロジェクトが見つかりません");
    });
  });

  describe("recalculateSchedulePreview", () => {
    it("DIコンテナからISchedulingApplicationServiceを取得しrecalculatePreviewへ委譲する", async () => {
      const params: SchedulePreviewRecalcParams = {
        baselineDateIso: "2026-06-15T00:00:00.000Z",
        scheduledTasks: [],
      };
      const serviceResult: SchedulePreviewRecalcResult = {
        workloads: [],
        tsv: "",
        warnings: [],
      };
      mockService.recalculatePreview.mockResolvedValue(serviceResult);

      const result = await recalculateSchedulePreview(7, params);

      expect(container.get).toHaveBeenCalledWith(
        SYMBOL.ISchedulingApplicationService
      );
      expect(mockService.recalculatePreview).toHaveBeenCalledWith(7, params);
      expect(result).toBe(serviceResult);
    });

    it("サービスがエラーを投げた場合はそのまま呼び出し元に伝播する", async () => {
      mockService.recalculatePreview.mockRejectedValue(
        new Error("基準日が不正です")
      );

      await expect(
        recalculateSchedulePreview(7, {
          baselineDateIso: "invalid",
          scheduledTasks: [],
        })
      ).rejects.toThrow("基準日が不正です");
    });
  });
});
