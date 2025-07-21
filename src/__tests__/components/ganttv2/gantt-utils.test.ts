import {
  calculateDateRange,
  filterTasks,
  generateTimeAxis,
  calculateTaskPositions,
  groupTasks,
  calculateMilestonePositions,
  formatDateToLocalString,
  TaskWithPosition,
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
        startDate: new Date("2024-01-10T00:00:00Z"),
        endDate: new Date("2024-01-20T00:00:00Z"),
      };
      const periods = [
        {
          yoteiStart: undefined,
          yoteiEnd: undefined,
        },
      ];

      const result = calculateDateRange(
        project,
        periods.map((period) => ({
          startDate: period.yoteiStart,
          endDate: period.yoteiEnd,
        }))
      );

      expect(result.start).not.toBeNull();
      expect(result.end).not.toBeNull();
      expect(result.start.toISOString().split("T")[0]).toEqual(new Date("2024-01-02").toISOString().split("T")[0]);
      expect(result.end.toISOString().split("T")[0]).toEqual(new Date("2024-01-26").toISOString().split("T")[0]);
    });
  });

  describe("calculateDateRange", () => {
    it("期間未設定のタスクがある場合", () => {
      const project: Project = {
        id: "1",
        name: "Test Project",
        status: "INACTIVE" as ProjectStatus,
        startDate: new Date("2024-01-10T00:00:00Z"),
        endDate: new Date("2024-01-20T00:00:00Z"),
      };
      const periods = [
        {
          yoteiStart: undefined,
          yoteiEnd: undefined,
        },
        {
          yoteiStart: new Date("2024-01-15T00:00:00Z"),
          yoteiEnd: new Date("2024-01-16T00:00:00Z"),
        },
      ];

      const result = calculateDateRange(
        project,
        periods.map((period) => ({
          startDate: period.yoteiStart,
          endDate: period.yoteiEnd,
        }))
      );

      expect(result.start).not.toBeNull();
      expect(result.end).not.toBeNull();
      expect(result.start.toISOString().split("T")[0]).toEqual(new Date("2024-01-02").toISOString().split("T")[0]);
      expect(result.end.toISOString().split("T")[0]).toEqual(new Date("2024-01-26").toISOString().split("T")[0]);
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
      start: new Date("2024-01-01"),
      end: new Date("2024-01-31"),
      // start: new Date("2025-05-14T00:00:00Z"),
      // end: new Date("2025-05-17T00:00:00Z"),
    };

    it("日表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "day");

      expect(timeAxis).toHaveLength(31);
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

      expect(timeAxis).toHaveLength(2); // 30日 / 30日 = 1月
      expect(chartWidth).toBe(1200); // 最小幅
    });

    it("四半期表示モードで時間軸を生成する", () => {
      const { timeAxis, chartWidth } = generateTimeAxis(dateRange, "quarter");

      expect(timeAxis).toHaveLength(1); // 30日 / 90日 = 1未満なので1
      expect(chartWidth).toBe(1200); // 最小幅
    });
  });

  describe("calculateTaskPositions", () => {
    it("タスクの位置とサイズを計算する", () => {
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const chartWidth = 3000; // 30日 * 100px/日
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
      expect(task.startPosition).toBeCloseTo((4 / 31) * 3000, 0);

      // 幅: 6日間（5日から10日まで）
      expect(task.width).toBeCloseTo((6 / 31) * 3000, 0);
    });

    it("タスクの位置とサイズを計算する 2日のタスク", () => {
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      };
      const chartWidth = 3000; // 30日 * 100px/日
      const tasks: WbsTask[] = [
        {
          id: 1,
          name: "Task 1",
          status: "NOT_STARTED" as TaskStatus,
          yoteiStart: new Date("2024-01-02"),
          yoteiEnd: new Date("2024-01-03"),
          jissekiStart: undefined,
          jissekiEnd: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = calculateTaskPositions(tasks, dateRange, chartWidth);

      expect(result).toHaveLength(1);
      const task = result[0];

      // 開始位置: 0日目（1月1日は1日目だが、0ベースなので0）
      expect(task.startPosition).toBeCloseTo((1 / 30) * chartWidth, 0);

      // 幅: 2日間（1日から2日まで）
      expect(task.width).toBeCloseTo((2 / 30) * chartWidth, 0);
    });

    it("タスクの位置とサイズを計算する 2日のタスク", () => {
      const dateRange = {
        start: new Date("2025-07-01"),
        end: new Date("2025-07-30"),
      };
      const { chartWidth } = generateTimeAxis(dateRange, "day");
      const tasks: WbsTask[] = [
        {
          id: 2,
          name: "Task 2",
          status: "NOT_STARTED" as TaskStatus,
          yoteiStart: new Date("2025-07-02"),
          yoteiEnd: new Date("2025-07-04"),
          jissekiStart: undefined,
          jissekiEnd: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = calculateTaskPositions(tasks, dateRange, chartWidth);

      expect(result).toHaveLength(1);
      const task1 = result[0];

      // 開始位置: 2日目（7月2日は7月2日だが、0ベースなので1）
      expect(task1.startPosition).toBeCloseTo((1 / 29) * chartWidth, 2);
      expect(task1.width).toBeCloseTo((1 / 29) * chartWidth, 0);
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
        name: "Task 1",
        status: "NOT_STARTED" as TaskStatus,
        phase: { id: 1, name: "Phase 1", seq: 1 },
        assignee: { id: 1, displayName: "User 1", name: "user1" },
        yoteiStart: undefined,
        yoteiEnd: undefined,
        jissekiStart: undefined,
        jissekiEnd: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        startPosition: 0,
        width: 100,
        groupId: "1",
      },
      {
        id: 2,
        name: "Task 2",
        status: "IN_PROGRESS" as TaskStatus,
        phase: { id: 1, name: "Phase 1", seq: 1 },
        assignee: { id: 2, displayName: "User 2", name: "user2" },
        yoteiStart: undefined,
        yoteiEnd: undefined,
        jissekiStart: undefined,
        jissekiEnd: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        startPosition: 100,
        width: 100,
        groupId: "1",
      },
    ] as TaskWithPosition[];

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

  describe("formatDateToLocalString", () => {
    it("ローカル日付をYYYY/MM/DD形式に変換する", () => {
      const date = new Date(2024, 0, 15); // 2024年1月15日（ローカル）
      const result = formatDateToLocalString(date);
      expect(result).toBe("2024/01/15");
    });

    it("一桁の月と日を0埋めする", () => {
      const date = new Date(2024, 2, 5); // 2024年3月5日
      const result = formatDateToLocalString(date);
      expect(result).toBe("2024/03/05");
    });

    it("年末年始の日付も正しく変換する", () => {
      const date = new Date(2023, 11, 31); // 2023年12月31日
      const result = formatDateToLocalString(date);
      expect(result).toBe("2023/12/31");
    });

    it("タイムゾーンに影響されない", () => {
      // 午前中の時刻でテスト（UTC変換で日付が変わらない）
      const date = new Date(2024, 0, 15, 10, 30, 0); // 2024年1月15日 10:30
      const result = formatDateToLocalString(date);
      expect(result).toBe("2024/01/15");
    });
  });
});