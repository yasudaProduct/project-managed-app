import { getImportScheduleLabel, WBS_SYNC_MODE_LABELS } from "@/utils/import-schedule-labels";

describe("import-schedule-labels", () => {
  describe("getImportScheduleLabel", () => {
    it.each([
      ["0 3 * * *", "毎日（3:00）"],
      ["0 9,12,17 * * *", "毎日 9時・12時・17時"],
      ["0 * * * *", "毎時"],
    ])("画面の選択肢にある cron 式（%s）は選択肢の表示名を返す", (cronExpression, label) => {
      expect(getImportScheduleLabel(cronExpression)).toBe(label);
    });

    it("選択肢にない cron 式はカスタムとして cron 式を表示する", () => {
      expect(getImportScheduleLabel("30 8 * * 1-5")).toBe("カスタム（30 8 * * 1-5）");
    });
  });

  it("同期モードの表示名", () => {
    expect(WBS_SYNC_MODE_LABELS).toEqual({ diff: "差分", replace: "洗い替え" });
  });
});
