import {
  filterTasks,
  isTaskFilterActive,
  countActiveFilters,
  isValidRegex,
  EMPTY_TASK_FILTER,
  UNASSIGNED_LABEL,
  type TaskFilter,
} from "@/components/ganttv3/utils/taskFilter";
import { makeTask } from "./_fixtures";

function filterOf(overrides: Partial<TaskFilter>): TaskFilter {
  return { ...EMPTY_TASK_FILTER, ...overrides };
}

const tasks = [
  makeTask({ id: "1", name: "設計レビュー", status: "IN_PROGRESS", assignee: "山田" }),
  makeTask({ id: "2", name: "実装タスクA", status: "NOT_STARTED", assignee: "田中" }),
  makeTask({ id: "3", name: "実装タスクB", status: "COMPLETED", assignee: "山田" }),
  makeTask({ id: "4", name: "テスト計画", status: "ON_HOLD" }), // 担当者なし
];

describe("isTaskFilterActive", () => {
  it("何も指定が無ければ false", () => {
    expect(isTaskFilterActive(EMPTY_TASK_FILTER)).toBe(false);
    expect(isTaskFilterActive(filterOf({ keyword: "   " }))).toBe(false);
  });

  it("keyword/statuses/assignees のいずれかがあれば true", () => {
    expect(isTaskFilterActive(filterOf({ keyword: "実装" }))).toBe(true);
    expect(isTaskFilterActive(filterOf({ statuses: ["COMPLETED"] }))).toBe(true);
    expect(isTaskFilterActive(filterOf({ assignees: ["山田"] }))).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("keyword は1件、statuses/assignees は件数で数える", () => {
    expect(countActiveFilters(EMPTY_TASK_FILTER)).toBe(0);
    expect(
      countActiveFilters(
        filterOf({ keyword: "実装", statuses: ["COMPLETED", "ON_HOLD"], assignees: ["山田"] }),
      ),
    ).toBe(1 + 2 + 1);
  });
});

describe("isValidRegex", () => {
  it("空文字と妥当な正規表現は true、不正は false", () => {
    expect(isValidRegex("")).toBe(true);
    expect(isValidRegex("実装.*A")).toBe(true);
    expect(isValidRegex("[")).toBe(false);
  });
});

describe("filterTasks", () => {
  it("条件が無ければ元配列をそのまま返す（同一参照）", () => {
    expect(filterTasks(tasks, EMPTY_TASK_FILTER)).toBe(tasks);
  });

  describe("キーワード（部分一致）", () => {
    it("タスク名の部分一致で絞り込む", () => {
      const result = filterTasks(tasks, filterOf({ keyword: "実装" }));
      expect(result.map((t) => t.id)).toEqual(["2", "3"]);
    });

    it("大文字小文字を無視する", () => {
      const t = [makeTask({ id: "x", name: "API Design" })];
      expect(filterTasks(t, filterOf({ keyword: "api" }))).toHaveLength(1);
    });

    it("複数語（空白/カンマ区切り）は OR で照合する", () => {
      const result = filterTasks(tasks, filterOf({ keyword: "設計, テスト" }));
      expect(result.map((t) => t.id)).toEqual(["1", "4"]);
    });

    it("全角空白でも複数語として分割する", () => {
      const result = filterTasks(tasks, filterOf({ keyword: "設計　テスト" }));
      expect(result.map((t) => t.id)).toEqual(["1", "4"]);
    });
  });

  describe("キーワード（正規表現）", () => {
    it("正規表現で照合する", () => {
      const result = filterTasks(
        tasks,
        filterOf({ keyword: "実装タスク[AB]", keywordMode: "regex" }),
      );
      expect(result.map((t) => t.id)).toEqual(["2", "3"]);
    });

    it("正規表現も大文字小文字を無視する", () => {
      const t = [makeTask({ id: "x", name: "Alpha" })];
      expect(
        filterTasks(t, filterOf({ keyword: "^alpha$", keywordMode: "regex" })),
      ).toHaveLength(1);
    });

    it("不正な正規表現は無視して全件返す", () => {
      const result = filterTasks(
        tasks,
        filterOf({ keyword: "[", keywordMode: "regex" }),
      );
      expect(result).toHaveLength(tasks.length);
    });
  });

  describe("ステータス", () => {
    it("選択したステータスのいずれかに一致するものだけ残す", () => {
      const result = filterTasks(
        tasks,
        filterOf({ statuses: ["COMPLETED", "ON_HOLD"] }),
      );
      expect(result.map((t) => t.id)).toEqual(["3", "4"]);
    });

    it("ステータス未設定タスクは NOT_STARTED として扱う", () => {
      const t = [makeTask({ id: "n", name: "no status" })]; // status undefined
      expect(filterTasks(t, filterOf({ statuses: ["NOT_STARTED"] }))).toHaveLength(1);
      expect(filterTasks(t, filterOf({ statuses: ["COMPLETED"] }))).toHaveLength(0);
    });
  });

  describe("担当者", () => {
    it("選択した担当者のいずれかに一致するものだけ残す", () => {
      const result = filterTasks(tasks, filterOf({ assignees: ["山田"] }));
      expect(result.map((t) => t.id)).toEqual(["1", "3"]);
    });

    it("担当者なしは UNASSIGNED_LABEL で絞り込める", () => {
      const result = filterTasks(
        tasks,
        filterOf({ assignees: [UNASSIGNED_LABEL] }),
      );
      expect(result.map((t) => t.id)).toEqual(["4"]);
    });
  });

  describe("複合条件（AND）", () => {
    it("キーワード・ステータス・担当者を同時に満たすものだけ残す", () => {
      const result = filterTasks(
        tasks,
        filterOf({ keyword: "実装", statuses: ["COMPLETED"], assignees: ["山田"] }),
      );
      expect(result.map((t) => t.id)).toEqual(["3"]);
    });
  });
});
