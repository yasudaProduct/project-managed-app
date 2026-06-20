import { isSteadyTask } from "@/domains/task-scheduling/steady-task-classifier";

describe("isSteadyTask", () => {
  test("キーワードが空配列なら常にfalse", () => {
    expect(isSteadyTask("プロジェクト管理", [])).toBe(false);
  });

  test("タスク名にキーワードが部分一致すればtrue", () => {
    expect(isSteadyTask("プロジェクト管理業務", ["プロジェクト管理"])).toBe(true);
    expect(isSteadyTask("日次PJ管理", ["管理"])).toBe(true);
  });

  test("部分一致しなければfalse", () => {
    expect(isSteadyTask("基本設計", ["管理"])).toBe(false);
  });

  test("複数キーワードのいずれかに一致すればtrue", () => {
    expect(isSteadyTask("定例会議", ["管理", "会議"])).toBe(true);
  });

  test("どのキーワードにも一致しなければfalse", () => {
    expect(isSteadyTask("詳細設計", ["管理", "会議"])).toBe(false);
  });

  test("空文字のキーワードは無視する", () => {
    expect(isSteadyTask("基本設計", [""])).toBe(false);
  });
});
