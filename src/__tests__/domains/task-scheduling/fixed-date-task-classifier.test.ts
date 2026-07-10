import { isFixedDateTask } from "@/domains/task-scheduling/fixed-date-task-classifier";

describe("isFixedDateTask", () => {
  test("キーワードが空配列なら常にfalse", () => {
    expect(isFixedDateTask("本番導入", [])).toBe(false);
  });

  test("タスク名にキーワードが部分一致すればtrue", () => {
    expect(isFixedDateTask("本番導入作業", ["本番導入"])).toBe(true);
    expect(isFixedDateTask("システムリリース", ["リリース"])).toBe(true);
  });

  test("部分一致しなければfalse", () => {
    expect(isFixedDateTask("単体テスト", ["本番導入"])).toBe(false);
  });

  test("複数キーワードのいずれかに一致すればtrue", () => {
    expect(isFixedDateTask("定例会", ["本番導入", "定例"])).toBe(true);
  });

  test("どのキーワードにも一致しなければfalse", () => {
    expect(isFixedDateTask("詳細設計", ["本番導入", "定例"])).toBe(false);
  });

  test("空文字のキーワードは無視する", () => {
    expect(isFixedDateTask("本番導入", [""])).toBe(false);
  });
});
