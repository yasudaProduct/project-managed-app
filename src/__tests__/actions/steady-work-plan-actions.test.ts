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
  listSteadyWorkTasks,
  createSteadyWorkTask,
  createSteadyWorkPlan,
  updateSteadyWorkPlan,
  deleteSteadyWorkPlan,
} from "@/app/wbs/[id]/actions/steady-work-plan-actions";
import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";

/**
 * 定常枠の Server Action（docs/plans/non-project-work-management.md §11.3）。
 * - 入力は Zod で検証し、日付は YYYY-MM-DD を UTC 深夜の Date に変換してサービスへ渡す
 * - 成功時は WBS 画面を再検証する
 */
describe("steady-work-plan actions", () => {
  const mockService = {
    listSteadyWorkTasks: jest.fn(),
    createSteadyWorkTask: jest.fn(),
    createSteadyWorkPlan: jest.fn(),
    updateSteadyWorkPlan: jest.fn(),
    deleteSteadyWorkPlan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (container.get as jest.Mock).mockImplementation((symbol: symbol) => {
      if (symbol === SYMBOL.IStandingWorkApplicationService) return mockService;
      throw new Error(`unexpected symbol: ${String(symbol)}`);
    });
  });

  describe("listSteadyWorkTasks", () => {
    it("WBS の定常タスク一覧を返す", async () => {
      const tasks = [{ taskId: 1, taskNo: "STD-1", name: "保守対応", assignee: null, plans: [] }];
      mockService.listSteadyWorkTasks.mockResolvedValue(tasks);

      await expect(listSteadyWorkTasks(5)).resolves.toEqual(tasks);
      expect(mockService.listSteadyWorkTasks).toHaveBeenCalledWith(5);
    });
  });

  describe("createSteadyWorkTask", () => {
    it("名前と担当者を検証してサービスへ渡し、WBS 画面を再検証する", async () => {
      mockService.createSteadyWorkTask.mockResolvedValue({ success: true, id: 77 });

      const result = await createSteadyWorkTask({ wbsId: 5, name: "保守対応", assigneeId: 300 });

      expect(result).toEqual({ success: true, data: { id: 77 } });
      expect(mockService.createSteadyWorkTask).toHaveBeenCalledWith({ wbsId: 5, name: "保守対応", assigneeId: 300 });
      expect(revalidatePath).toHaveBeenCalledWith("/wbs/5");
    });

    it("名前が空なら入力エラーを返し、サービスを呼ばない", async () => {
      const result = await createSteadyWorkTask({ wbsId: 5, name: "   " });

      expect(result).toEqual({ success: false, error: "入力値が不正です。" });
      expect(mockService.createSteadyWorkTask).not.toHaveBeenCalled();
    });

    it("サービスの失敗はエラーとして返し、再検証しない", async () => {
      mockService.createSteadyWorkTask.mockResolvedValue({
        success: false,
        error: "常設プロジェクトのWBSにのみ定常タスクを追加できます",
      });

      const result = await createSteadyWorkTask({ wbsId: 5, name: "保守対応" });

      expect(result).toEqual({ success: false, error: "常設プロジェクトのWBSにのみ定常タスクを追加できます" });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("createSteadyWorkPlan", () => {
    it("YYYY-MM-DD を UTC 深夜の Date に変換してサービスへ渡す（終了日なしは undefined）", async () => {
      mockService.createSteadyWorkPlan.mockResolvedValue({ success: true, id: 99 });

      const result = await createSteadyWorkPlan({
        wbsId: 5,
        taskId: 1,
        unit: "PER_MONTH",
        hours: 20,
        validFrom: "2026-04-01",
        validTo: null,
      });

      expect(result).toEqual({ success: true, data: { id: 99 } });
      expect(mockService.createSteadyWorkPlan).toHaveBeenCalledWith({
        taskId: 1,
        unit: "PER_MONTH",
        hours: 20,
        validFrom: new Date("2026-04-01T00:00:00.000Z"),
        validTo: undefined,
      });
      expect(revalidatePath).toHaveBeenCalledWith("/wbs/5");
    });

    it("終了日ありは Date に変換して渡す", async () => {
      mockService.createSteadyWorkPlan.mockResolvedValue({ success: true, id: 99 });

      await createSteadyWorkPlan({
        wbsId: 5,
        taskId: 1,
        unit: "PER_DAY",
        hours: 1,
        validFrom: "2026-04-01",
        validTo: "2027-03-31",
      });

      expect(mockService.createSteadyWorkPlan).toHaveBeenCalledWith(
        expect.objectContaining({ validTo: new Date("2027-03-31T00:00:00.000Z") })
      );
    });

    it("単位が不正・時間が負・日付形式が不正なら入力エラーを返す", async () => {
      const base = { wbsId: 5, taskId: 1, unit: "PER_DAY" as const, hours: 1, validFrom: "2026-04-01" };

      await expect(createSteadyWorkPlan({ ...base, unit: "PER_WEEK" as never })).resolves.toEqual({
        success: false,
        error: "入力値が不正です。",
      });
      await expect(createSteadyWorkPlan({ ...base, hours: -1 })).resolves.toEqual({
        success: false,
        error: "入力値が不正です。",
      });
      await expect(createSteadyWorkPlan({ ...base, validFrom: "2026/04/01" })).resolves.toEqual({
        success: false,
        error: "入力値が不正です。",
      });
      expect(mockService.createSteadyWorkPlan).not.toHaveBeenCalled();
    });

    it("サービスの失敗（期間重複など）はエラーとして返す", async () => {
      mockService.createSteadyWorkPlan.mockResolvedValue({ success: false, error: "定常枠の有効期間が重なっています" });

      const result = await createSteadyWorkPlan({
        wbsId: 5,
        taskId: 1,
        unit: "PER_DAY",
        hours: 1,
        validFrom: "2026-04-01",
      });

      expect(result).toEqual({ success: false, error: "定常枠の有効期間が重なっています" });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateSteadyWorkPlan", () => {
    it("ID と内容を検証して更新し、WBS 画面を再検証する", async () => {
      mockService.updateSteadyWorkPlan.mockResolvedValue({ success: true });

      const result = await updateSteadyWorkPlan({
        wbsId: 5,
        id: 10,
        unit: "PER_DAY",
        hours: 0.5,
        validFrom: "2026-05-01",
        validTo: "2026-09-30",
      });

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockService.updateSteadyWorkPlan).toHaveBeenCalledWith({
        id: 10,
        unit: "PER_DAY",
        hours: 0.5,
        validFrom: new Date("2026-05-01T00:00:00.000Z"),
        validTo: new Date("2026-09-30T00:00:00.000Z"),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/wbs/5");
    });
  });

  describe("deleteSteadyWorkPlan", () => {
    it("削除してWBS 画面を再検証する", async () => {
      mockService.deleteSteadyWorkPlan.mockResolvedValue({ success: true });

      const result = await deleteSteadyWorkPlan({ wbsId: 5, id: 10 });

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockService.deleteSteadyWorkPlan).toHaveBeenCalledWith(10);
      expect(revalidatePath).toHaveBeenCalledWith("/wbs/5");
    });

    it("サービスの失敗はエラーとして返す", async () => {
      mockService.deleteSteadyWorkPlan.mockResolvedValue({ success: false, error: "定常枠が見つかりません" });

      await expect(deleteSteadyWorkPlan({ wbsId: 5, id: 999 })).resolves.toEqual({
        success: false,
        error: "定常枠が見つかりません",
      });
    });
  });
});
