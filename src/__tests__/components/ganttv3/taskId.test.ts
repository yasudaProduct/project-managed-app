import { parseDbId } from "@/components/ganttv3/utils/taskId";

describe("parseDbId", () => {
  it("task- 接頭辞を剥がして数値を返す", () => {
    expect(parseDbId("task-5")).toBe(5);
    expect(parseDbId("task-16000")).toBe(16000);
  });

  it("ms- 接頭辞を剥がして数値を返す", () => {
    expect(parseDbId("ms-5")).toBe(5);
  });

  it("接頭辞なしの数値文字列もそのまま数値化する（後方互換）", () => {
    expect(parseDbId("42")).toBe(42);
  });
});
