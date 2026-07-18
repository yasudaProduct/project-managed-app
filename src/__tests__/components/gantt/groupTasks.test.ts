import { groupTasksByType } from "@/components/gantt/utils/groupTasks";
import type { Task, GanttPhase } from "@/components/gantt/gantt";

function makeTask(p: Partial<Task> & { id: string }): Task {
  return {
    name: p.id,
    startDate: new Date("2024-01-01T00:00:00.000Z"),
    endDate: new Date("2024-01-03T00:00:00.000Z"),
    duration: 2,
    color: "#000000",
    isMilestone: false,
    progress: 0,
    predecessors: [],
    level: 0,
    isManuallyScheduled: false,
    ...p,
  };
}

const noPhases: GanttPhase[] = [];

describe("groupTasksByType", () => {
  describe("groupBy='none'", () => {
    it("全タスクを1グループにまとめる", () => {
      const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })];
      const groups = groupTasksByType(tasks, "none", noPhases);
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe("all");
      expect(groups[0].name).toBe("すべてのタスク");
      expect(groups[0].tasks).toHaveLength(2);
    });

    it("既定では taskNo の自然順でソートする", () => {
      const tasks = [
        makeTask({ id: "a", taskNo: "P-0010" }),
        makeTask({ id: "b", taskNo: "P-0002" }),
        makeTask({ id: "c", taskNo: "P-0001" }),
      ];
      const [group] = groupTasksByType(tasks, "none", noPhases);
      expect(group.tasks.map((t) => t.taskNo)).toEqual([
        "P-0001",
        "P-0002",
        "P-0010",
      ]);
    });

    it("sortBy='startDate' で開始日順にソートする", () => {
      const tasks = [
        makeTask({ id: "a", startDate: new Date("2024-03-01T00:00:00.000Z") }),
        makeTask({ id: "b", startDate: new Date("2024-01-01T00:00:00.000Z") }),
        makeTask({ id: "c", startDate: new Date("2024-02-01T00:00:00.000Z") }),
      ];
      const [group] = groupTasksByType(tasks, "none", noPhases, "startDate");
      expect(group.tasks.map((t) => t.id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("groupBy='phase'", () => {
    const phases: GanttPhase[] = [
      { id: "p1", name: "設計", color: "#111111" },
      { id: "p2", name: "実装", color: "#222222" },
    ];

    it("phases の順序でグループ化し、色とidを引き継ぐ", () => {
      const tasks = [
        makeTask({ id: "1", category: "実装" }),
        makeTask({ id: "2", category: "設計" }),
      ];
      const groups = groupTasksByType(tasks, "phase", phases);
      expect(groups.map((g) => g.name)).toEqual(["設計", "実装"]);
      expect(groups[0]).toMatchObject({ id: "p1", color: "#111111" });
    });

    it("タスクのないフェーズは省略する", () => {
      const tasks = [makeTask({ id: "1", category: "設計" })];
      const groups = groupTasksByType(tasks, "phase", phases);
      expect(groups.map((g) => g.name)).toEqual(["設計"]);
    });

    it("category 未設定のタスクは末尾の「未分類」に入る", () => {
      const tasks = [
        makeTask({ id: "1", category: "設計" }),
        makeTask({ id: "3" }), // category 未設定
      ];
      const groups = groupTasksByType(tasks, "phase", phases);
      const last = groups[groups.length - 1];
      expect(last.name).toBe("未分類");
      expect(last.id).toBe("unassigned");
      expect(last.tasks.map((t) => t.id)).toEqual(["3"]);
    });

    // 既存仕様の特性化: phases に無い非空カテゴリのタスクはどのグループにも現れず脱落する。
    // （潜在的な不具合の可能性あり。挙動変更は別途検討）
    it("phases に存在しない非空カテゴリのタスクは出力から脱落する", () => {
      const tasks = [
        makeTask({ id: "1", category: "設計" }),
        makeTask({ id: "2", category: "その他" }), // phases に無い
      ];
      const groups = groupTasksByType(tasks, "phase", phases);
      expect(groups.map((g) => g.name)).toEqual(["設計"]);
      const allTaskIds = groups.flatMap((g) => g.tasks.map((t) => t.id));
      expect(allTaskIds).not.toContain("2");
    });
  });

  describe("groupBy='assignee'", () => {
    it("assigneeSeq の昇順で並び、未割当は末尾", () => {
      const tasks = [
        makeTask({ id: "1", assignee: "佐藤", assigneeSeq: 2 }),
        makeTask({ id: "2" }), // 未割当
        makeTask({ id: "3", assignee: "鈴木", assigneeSeq: 1 }),
      ];
      const groups = groupTasksByType(tasks, "assignee", noPhases);
      expect(groups.map((g) => g.name)).toEqual(["鈴木", "佐藤", "未割当"]);
    });
  });

  describe("groupBy='status'", () => {
    it("未着手→進行中→完了の順でラベル付けする", () => {
      const tasks = [
        makeTask({ id: "1", status: "COMPLETED" }),
        makeTask({ id: "2", status: "NOT_STARTED" }),
        makeTask({ id: "3", status: "IN_PROGRESS" }),
      ];
      const groups = groupTasksByType(tasks, "status", noPhases);
      expect(groups.map((g) => g.name)).toEqual(["未着手", "進行中", "完了"]);
    });
  });
});
