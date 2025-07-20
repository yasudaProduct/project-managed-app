import {
  calculateDateRange,
  filterTasks,
  generateTimeAxis,
  calculateTaskPositions,
  groupTasks,
  calculateMilestonePositions,
} from "@/components/ganttv2/gantt-utils";
import { WbsTask, Milestone, TaskStatus, ProjectStatus } from "@/types/wbs";
import { Project } from "@/types/project";

describe("gantt-utils", () => {
  describe("calculateDateRange", () => {
    it("プロジェクトの日付範囲に前後7日のバッファを追加する", () => {
      const project: Project = {
        id: "1",
        name: "Test Project",
        status: "INACTIVE" as ProjectStatus,
        startDate: new Date("2025-05-09"),
        endDate: new Date("2025-05-16"),
      };

      const result = calculateDateRange(project);
      console.log(result);
      console.log(result.start);
      console.log(result.start.toISOString());

      expect(result.start).toEqual(new Date("2025-05-02"));
      expect(result.end).toEqual(new Date("2025-05-23"));
    });
  });

  describe("filterTasks", () => {
    const tasks: WbsTask[] = [
      {
        id: 1,
        name: "Task 1",
        status: "NOT_STARTED" as TaskStatus,
        yoteiStart: new Date("2024-01-10"),
        yoteiEnd: new Date("2024-01-15"),
        jissekiStart: undefined,
        jissekiEnd: undefined,
        assignee: { id: 1, displayName: "User 1", name: "user1" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Task 2",
        status: "IN_PROGRESS" as TaskStatus,
        yoteiStart: new Date("2024-01-12"),
        yoteiEnd: new Date("2024-01-18"),
        jissekiStart: undefined,
        jissekiEnd: undefined,
        assignee: { id: 2, displayName: "User 2", name: "user2" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("すべてのタスクを返す（フィルタなし）", () => {
      const result = filterTasks(tasks, "all", "all");
      expect(result).toHaveLength(2);
    });

    it("ステータスでフィルタリングする", () => {
      const result = filterTasks(tasks, "NOT_STARTED", "all");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("担当者でフィルタリングする", () => {
      const result = filterTasks(tasks, "all", "User 2");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("ステータスと担当者の両方でフィルタリングする", () => {
      const result = filterTasks(tasks, "NOT_STARTED", "User 1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("generateTimeAxis", () => {
    const dateRange = {
      start: new Date("2025-05-09"),
      end: new Date("2025-05-13"),
    };

    it("日表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "day");

      console.log(timeAxis);
      console.log(chartWidth);
      expect(timeAxis).toHaveLength(5); // 1月は31日間だが、0時で正規化されるため30日間
      expect(chartWidth).toBeGreaterThan(1200); // 最小幅以上

      // タイムゾーンの影響を受けないように日付を比較
      const expectedDate = new Date("2024-01-01");
      expectedDate.setHours(0, 0, 0, 0);
      expect(timeAxis[0].date.getFullYear()).toBe(expectedDate.getFullYear());
      expect(timeAxis[0].date.getMonth()).toBe(expectedDate.getMonth());
      expect(timeAxis[0].date.getDate()).toBe(expectedDate.getDate());

      expect(timeAxis[0].position).toBe(0);
    });

    it("週表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "week");

      expect(timeAxis).toHaveLength(5); // 30日 / 7日 = 約5週間
      expect(chartWidth).toBeGreaterThanOrEqual(1200);
    });

    it("月表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "month");

      expect(timeAxis).toHaveLength(1); // 30日 / 30日 = 1月
      expect(chartWidth).toBe(1200); // 最小幅
    });

    it("四半期表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "quarter");

      expect(timeAxis).toHaveLength(1); // 30日 / 90日 = 1未満なので1
      expect(chartWidth).toBe(1200); // 最小幅
    });
  });

  describe("calculateTaskPositions", () => {
    const dateRange = {
      start: new Date("2024-01-01"),
      end: new Date("2024-01-31"),
    };
    const chartWidth = 3000; // 30日 * 100px/日

    it("タスクの位置とサイズを計算する", () => {
      const tasks: WbsTask[] = [
        {
          id: 1,
          name: "Task 1",
          status: "NOT_STARTED" as TaskStatus,
          yoteiStart: new Date("2024-01-05"),
          yoteiEnd: new Date("2024-01-10"),
          jissekiStart: undefined,
          jissekiEnd: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = calculateTaskPositions(tasks, dateRange, chartWidth);

      expect(result).toHaveLength(1);
      const task = result[0];

      // 開始位置: 4日目（1月5日は5日目だが、0ベースなので4）
      expect(task.startPosition).toBeCloseTo((4 / 30) * 3000, 0);

      // 幅: 7日間（5日から10日まで + 2日）
      expect(task.width).toBeCloseTo((7 / 30) * 3000, 0);
    });

    it("開始日がない場合は範囲開始日を使用する", () => {
      const tasks: WbsTask[] = [
        {
          id: 1,
          name: "Task 1",
          status: "NOT_STARTED" as TaskStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = calculateTaskPositions(tasks, dateRange, chartWidth);

      expect(result[0].startPosition).toBe(0);
      expect(result[0].width).toBeGreaterThan(0); // 最小幅
    });
  });

  describe("groupTasks", () => {
    const tasks = [
      {
        id: 1,
        wbsId: 1,
        name: "Task 1",
        description: "",
        status: "planning" as TaskStatus,
        sequence: 1,
        phase: { id: 1, name: "Phase 1" },
        assignee: { id: 1, displayName: "User 1", name: "user1" },
        startPosition: 0,
        width: 100,
        yoteiStart: null,
        yoteiEnd: null,
        jissekiStart: null,
        jissekiEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        wbsId: 1,
        name: "Task 2",
        description: "",
        status: "working" as TaskStatus,
        sequence: 2,
        phase: { id: 1, name: "Phase 1" },
        assignee: { id: 2, displayName: "User 2", name: "user2" },
        startPosition: 100,
        width: 100,
        yoteiStart: null,
        yoteiEnd: null,
        jissekiStart: null,
        jissekiEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any[];

    it("グループ化なしの場合、すべてのタスクを1つのグループにする", () => {
      const result = groupTasks(tasks, "none", new Set());

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("all");
      expect(result[0].tasks).toHaveLength(2);
    });

    it("フェーズでグループ化する", () => {
      const result = groupTasks(tasks, "phase", new Set());

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Phase 1");
      expect(result[0].tasks).toHaveLength(2);
    });

    it("担当者でグループ化する", () => {
      const result = groupTasks(tasks, "assignee", new Set());

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("User 1");
      expect(result[0].tasks).toHaveLength(1);
      expect(result[1].name).toBe("User 2");
      expect(result[1].tasks).toHaveLength(1);
    });

    it("ステータスでグループ化する", () => {
      const result = groupTasks(tasks, "status", new Set());

      expect(result).toHaveLength(2);
    });

    it("折りたたまれたグループを正しく設定する", () => {
      const collapsedGroups = new Set(["1"]);
      const result = groupTasks(tasks, "phase", collapsedGroups);

      expect(result[0].collapsed).toBe(true);
    });
  });

  describe("calculateMilestonePositions", () => {
    const dateRange = {
      start: new Date("2024-01-01"),
      end: new Date("2024-01-31"),
    };
    const chartWidth = 3000; // 30日 * 100px/日

    it("マイルストーンの位置を計算する", () => {
      const milestones: Milestone[] = [
        {
          id: 1,
          name: "Milestone 1",
          date: new Date("2024-01-15"),
        },
      ];

      const result = calculateMilestonePositions(
        milestones,
        dateRange,
        chartWidth
      );

      expect(result).toHaveLength(1);
      const milestone = result[0];

      // 位置: 14日目（1月15日は15日目だが、0ベースなので14）
      expect(milestone.position).toBeCloseTo((14 / 30) * 3000, 0);
    });

    it("複数のマイルストーンの位置を計算する", () => {
      const milestones: Milestone[] = [
        {
          id: 1,
          name: "Milestone 1",
          date: new Date("2024-01-10"),
        },
        {
          id: 2,
          name: "Milestone 2",
          date: new Date("2024-01-20"),
        },
      ];

      const result = calculateMilestonePositions(
        milestones,
        dateRange,
        chartWidth
      );

      expect(result).toHaveLength(2);
      expect(result[0].position).toBeCloseTo((9 / 30) * 3000, 0);
      expect(result[1].position).toBeCloseTo((19 / 30) * 3000, 0);
    });
  });
});