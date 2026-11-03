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
import { importOutlookSchedule } from "@/app/schedule/actions";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import type { OutlookCalendarRowDto, OutlookScheduleImportSummaryDto } from "@/types/outlook-calendar";

describe("schedule actions", () => {
  const mockScheduleService = {
    getSchedules: jest.fn(),
    importScheduleTsv: jest.fn(),
    importOutlookSchedules: jest.fn(),
  };

  const row: OutlookCalendarRowDto = {
    rowNumber: 2,
    subject: "定例会議",
    startDate: "2026/11/2",
    startTime: "10:00:00",
    endDate: "2026/11/2",
    endTime: "11:00:00",
    allDay: "FALSE",
    location: "会議室A",
    description: "",
    showTimeAs: "2",
  };

  const summary: OutlookScheduleImportSummaryDto = {
    importedEventCount: 1,
    createdScheduleCount: 1,
    skippedEventCount: 0,
    periodStart: "2026-11-02",
    periodEnd: "2026-11-02",
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.IScheduleApplicationService) return mockScheduleService;
      throw new Error(`unexpected symbol: ${String(symbol)}`);
    });
  });

  describe("importOutlookSchedule", () => {
    it("検証済みの入力でApplication Serviceを呼び、取り込み結果を返してスケジュール画面を再検証すること", async () => {
      mockScheduleService.importOutlookSchedules.mockResolvedValue({ success: true, data: summary });

      const result = await importOutlookSchedule({ userId: "u1", rows: [row] });

      expect(mockScheduleService.importOutlookSchedules).toHaveBeenCalledWith({ userId: "u1", rows: [row] });
      expect(result).toEqual({ success: true, data: summary });
      expect(revalidatePath).toHaveBeenCalledWith("/schedule");
    });

    it("任意列が省略された行も受け付けること", async () => {
      mockScheduleService.importOutlookSchedules.mockResolvedValue({ success: true, data: summary });
      const minimalRow = { rowNumber: 2, subject: "休暇", startDate: "2026/11/2" };

      const result = await importOutlookSchedule({ userId: "u1", rows: [minimalRow] });

      expect(result.success).toBe(true);
      expect(mockScheduleService.importOutlookSchedules).toHaveBeenCalledWith({ userId: "u1", rows: [minimalRow] });
    });

    it("取り込み先ユーザーが未指定の場合はエラーを返すこと", async () => {
      const result = await importOutlookSchedule({ userId: "", rows: [row] });

      expect(result).toEqual({ success: false, error: "取り込み先のユーザーを選択してください。" });
      expect(mockScheduleService.importOutlookSchedules).not.toHaveBeenCalled();
    });

    it("行が空の場合はエラーを返すこと", async () => {
      const result = await importOutlookSchedule({ userId: "u1", rows: [] });

      expect(result).toEqual({ success: false, error: "取り込むデータがありません。" });
      expect(mockScheduleService.importOutlookSchedules).not.toHaveBeenCalled();
    });

    it("行数が上限を超える場合はエラーを返すこと", async () => {
      const rows = Array.from({ length: 10001 }, (_, index) => ({ ...row, rowNumber: index + 2 }));

      const result = await importOutlookSchedule({ userId: "u1", rows });

      expect(result).toEqual({
        success: false,
        error: "一度に取り込める予定は10000件までです。期間を分けてエクスポートしてください。",
      });
      expect(mockScheduleService.importOutlookSchedules).not.toHaveBeenCalled();
    });

    it("行の形式が不正な場合はエラーを返すこと", async () => {
      const result = await importOutlookSchedule({
        userId: "u1",
        rows: [{ rowNumber: 2, subject: 123, startDate: "2026/11/2" }],
      } as never);

      expect(result).toEqual({ success: false, error: "入力値が不正です。" });
      expect(mockScheduleService.importOutlookSchedules).not.toHaveBeenCalled();
    });

    it("Application Serviceが失敗した場合はエラーを返し、再検証しないこと", async () => {
      mockScheduleService.importOutlookSchedules.mockResolvedValue({
        success: false,
        error: "取り込み先のユーザーが存在しません",
      });

      const result = await importOutlookSchedule({ userId: "u1", rows: [row] });

      expect(result).toEqual({ success: false, error: "取り込み先のユーザーが存在しません" });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
