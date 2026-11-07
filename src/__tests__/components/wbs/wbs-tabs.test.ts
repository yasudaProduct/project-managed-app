import { getWbsTabs, resolveWbsTab } from "@/components/wbs/wbs-tabs";

/**
 * WBS 画面のタブ構成（docs/plans/non-project-work-management.md §6.6, §11.3）。
 * 常設プロジェクトは サマリー / リスト / 定常枠 / 担当者ガント / 設定 のみ。
 */
describe("getWbsTabs", () => {
  it("案件は従来のタブ構成（EVM を含む）を返す", () => {
    expect(getWbsTabs("PROJECT", { showEvm: true })).toEqual([
      "summary",
      "list",
      "milestone",
      "table",
      "assignee-gantt",
      "evm",
      "task-scheduling",
      "settings",
    ]);
  });

  it("案件で showEvm が false なら EVM タブを含めない", () => {
    expect(getWbsTabs("PROJECT", { showEvm: false })).not.toContain("evm");
  });

  it("常設は サマリー / リスト / 定常枠 / 担当者ガント / 設定 のみ（showEvm に関わらず）", () => {
    expect(getWbsTabs("STANDING", { showEvm: true })).toEqual([
      "summary",
      "list",
      "steady-work",
      "assignee-gantt",
      "settings",
    ]);
  });

  it("案件には定常枠タブを出さない", () => {
    expect(getWbsTabs("PROJECT")).not.toContain("steady-work");
  });
});

describe("resolveWbsTab", () => {
  it("要求されたタブが構成にあればそのまま、無ければサマリーに戻す", () => {
    expect(resolveWbsTab("PROJECT", "list")).toBe("list");
    expect(resolveWbsTab("STANDING", "evm")).toBe("summary");
    expect(resolveWbsTab("STANDING", "steady-work")).toBe("steady-work");
    expect(resolveWbsTab("PROJECT", undefined)).toBe("summary");
    expect(resolveWbsTab("PROJECT", "unknown-tab")).toBe("summary");
  });
});
