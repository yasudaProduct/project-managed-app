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

import { revalidatePath } from "next/cache";
import {
  getWbsImportSchedule,
  updateWbsImportSchedule,
} from "@/app/wbs/[id]/import-schedule-actions";
import {
  getImportScheduleOverview,
  updateImportScheduleEnabled,
} from "@/app/settings/system/import-schedule-actions";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";

describe("import-schedule actions", () => {
  const mockScheduleService = {
    getWbsImportSchedule: jest.fn(),
    updateWbsImportSchedule: jest.fn(),
    listWbsImportSchedules: jest.fn(),
    getImportScheduleSettings: jest.fn(),
    updateImportScheduleSettings: jest.fn(),
  };

  const validInput = {
    wbsId: 1,
    isEnabled: true,
    cronExpression: "0 9,12,17 * * *",
    syncMode: "diff" as const,
    includeActuals: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.IImportScheduleApplicationService) return mockScheduleService;
      throw new Error(`unexpected symbol: ${String(symbol)}`);
    });
  });

  describe("getWbsImportSchedule", () => {
    it("WBSの定期インポート設定を返す", async () => {
      const schedule = { ...validInput, timezone: "Asia/Tokyo", nextRunAt: null, lastRunAt: null };
      mockScheduleService.getWbsImportSchedule.mockResolvedValue(schedule);

      await expect(getWbsImportSchedule(1)).resolves.toEqual(schedule);
      expect(mockScheduleService.getWbsImportSchedule).toHaveBeenCalledWith(1);
    });
  });

  describe("updateWbsImportSchedule", () => {
    it("入力を検証して保存し、WBS画面とシステム設定画面を再検証する", async () => {
      mockScheduleService.updateWbsImportSchedule.mockResolvedValue({ success: true });

      const result = await updateWbsImportSchedule(validInput);

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockScheduleService.updateWbsImportSchedule).toHaveBeenCalledWith(validInput);
      expect(revalidatePath).toHaveBeenCalledWith("/wbs/1");
      expect(revalidatePath).toHaveBeenCalledWith("/settings/system");
    });

    it.each([
      ["同期モードが不正", { syncMode: "full" }],
      ["wbsId が不正", { wbsId: 0 }],
      ["cron 式が空", { cronExpression: "" }],
    ])("入力が不正な場合（%s）はエラーを返し、保存しない", async (_, overrides) => {
      const result = await updateWbsImportSchedule({ ...validInput, ...overrides } as typeof validInput);

      expect(result).toEqual({ success: false, error: "入力値が不正です。" });
      expect(mockScheduleService.updateWbsImportSchedule).not.toHaveBeenCalled();
    });

    it("保存に失敗した場合はサービスのエラーを返す", async () => {
      mockScheduleService.updateWbsImportSchedule.mockResolvedValue({
        success: false,
        error: "実行タイミングの指定が不正です: x",
      });

      const result = await updateWbsImportSchedule(validInput);

      expect(result).toEqual({ success: false, error: "実行タイミングの指定が不正です: x" });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("getImportScheduleOverview", () => {
    it("全体設定とWBSごとの設定一覧を返す", async () => {
      mockScheduleService.getImportScheduleSettings.mockResolvedValue({ isEnabled: true });
      mockScheduleService.listWbsImportSchedules.mockResolvedValue([{ wbsId: 1 }]);

      await expect(getImportScheduleOverview()).resolves.toEqual({
        settings: { isEnabled: true },
        schedules: [{ wbsId: 1 }],
      });
    });
  });

  describe("updateImportScheduleEnabled", () => {
    it("定期インポート全体の有効/無効を保存し、システム設定画面を再検証する", async () => {
      const result = await updateImportScheduleEnabled(false);

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockScheduleService.updateImportScheduleSettings).toHaveBeenCalledWith(false);
      expect(revalidatePath).toHaveBeenCalledWith("/settings/system");
    });

    it("真偽値以外はエラーを返す", async () => {
      const result = await updateImportScheduleEnabled("false" as unknown as boolean);

      expect(result).toEqual({ success: false, error: "入力値が不正です。" });
      expect(mockScheduleService.updateImportScheduleSettings).not.toHaveBeenCalled();
    });
  });
});
