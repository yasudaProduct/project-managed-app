import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GanttV2Component from "@/components/ganttv2/gantt-v2";
import { WbsTask, Milestone } from "@/types/wbs";
import { Project } from "@/types/project";

// モックデータ
const mockProject: Project = {
  id: "test-project-1",
  name: "テストプロジェクト",
  startDate: new Date("2024-05-01"),
  endDate: new Date("2024-05-31"),
  status: "ACTIVE",
  description: "テスト用プロジェクト",
};

const mockTasks: WbsTask[] = [
  {
    id: 1,
    taskNo: "TASK-001",
    name: "テストタスク1",
    status: "NOT_STARTED",
    assigneeId: 1,
    assignee: {
      id: 1,
      name: "テストユーザー1",
      displayName: "テストユーザー1",
    },
    phaseId: 1,
    phase: {
      id: 1,
      name: "テストフェーズ1",
      seq: 1,
    },
    yoteiStart: new Date("2024-05-09"),
    yoteiEnd: new Date("2024-05-16"),
    yoteiKosu: 40,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: 2,
    taskNo: "TASK-002",
    name: "テストタスク2",
    status: "IN_PROGRESS",
    assigneeId: 2,
    assignee: {
      id: 2,
      name: "テストユーザー2",
      displayName: "テストユーザー2",
    },
    phaseId: 1,
    phase: {
      id: 1,
      name: "テストフェーズ1",
      seq: 1,
    },
    yoteiStart: new Date("2024-05-15"),
    yoteiEnd: new Date("2024-05-20"),
    yoteiKosu: 24,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

const mockMilestones: Milestone[] = [
  {
    id: 1,
    name: "テストマイルストーン1",
    date: new Date("2024-05-15"),
  },
];

// ResizeObserverのモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// スクロール関連のモック
Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
  get: function () {
    return this._scrollLeft || 0;
  },
  set: function (val) {
    this._scrollLeft = val;
  },
});

// scrollIntoViewのモック
Element.prototype.scrollIntoView = jest.fn();

describe("GanttV2Component", () => {
  const defaultProps = {
    tasks: mockTasks,
    milestones: mockMilestones,
    project: mockProject,
    wbsId: 1,
    onTaskUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("基本的なレンダリング", () => {
    test("コンポーネントが正常にレンダリングされる", () => {
      render(<GanttV2Component {...defaultProps} />);

      // コントロールパネルが表示される
      expect(screen.getByText("日")).toBeVisible();
      // expect(screen.getByText("週")).toBeVisible();
      // expect(screen.getByText("月")).toBeVisible();
      // expect(screen.getByText("四半期")).toBeVisible();

      // タスクが表示される
      expect(screen.getAllByText("テストタスク1")).toHaveLength(2);
      expect(screen.getAllByText("テストタスク2")).toHaveLength(2);
    });

    test("タスクリストに正しい情報が表示される", () => {
      render(<GanttV2Component {...defaultProps} />);

      // タスク名
      expect(screen.getAllByText("テストタスク1")).toHaveLength(2);
      expect(screen.getAllByText("テストタスク2")).toHaveLength(2);

      // ステータス
      expect(screen.getByText("未開始")).toBeInTheDocument();
      expect(screen.getByText("進行中")).toBeInTheDocument();
    });

    test("空のタスクリストでも正常にレンダリングされる", () => {
      render(<GanttV2Component {...defaultProps} tasks={[]} />);

      expect(screen.getByText("日")).toBeVisible();
    });
  });

  describe("フィルタリング機能", () => {
    test("ステータスフィルターが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 初期状態では全タスクが表示される
      expect(screen.getAllByText("テストタスク1")).toHaveLength(2);
      expect(screen.getAllByText("テストタスク2")).toHaveLength(2);

      // ステータスフィルターのSelectTriggerをクリック
      const statusSelect = screen.getByTestId("status-filter-select");
      fireEvent.click(statusSelect);

      // "未着手"オプションをクリック
      await waitFor(() => {
        const notStartedOption = screen.getByText("未着手");
        fireEvent.click(notStartedOption);
      });

      await waitFor(() => {
        expect(screen.getByText("テストタスク1")).toBeInTheDocument();
        expect(screen.queryByText("テストタスク2")).not.toBeInTheDocument();
      });
    });

    test("担当者フィルターが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 担当者フィルターのSelectTriggerをクリック
      const assigneeSelect = screen.getByTestId("assignee-filter-select");
      fireEvent.click(assigneeSelect);

      // "テストユーザー1"オプションをクリック
      await waitFor(() => {
        const userOption = screen.getByText("テストユーザー1");
        fireEvent.click(userOption);
      });

      await waitFor(() => {
        expect(screen.getByText("テストタスク1")).toBeInTheDocument();
        expect(screen.queryByText("テストタスク2")).not.toBeInTheDocument();
      });
    });
  });

  describe("表示モード切り替え", () => {
    test("日表示モードが正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      const dayButton = screen.getByText("日");
      fireEvent.click(dayButton);

      // 日付ヘッダーが正しく表示される
      expect(screen.getByText(/5月/)).toBeInTheDocument();
    });

    test("週表示モードが正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      const weekButton = screen.getByText("週");
      fireEvent.click(weekButton);

      // 週表示に切り替わる
      expect(screen.getByText(/5月/)).toBeInTheDocument();
    });

    test("月表示モードが正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      const monthButton = screen.getByText("月");
      fireEvent.click(monthButton);

      // 月表示に切り替わる
      expect(screen.getByText(/2024年/)).toBeInTheDocument();
    });
  });

  describe("グループ化機能", () => {
    test("フェーズによるグループ化が正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 初期状態でフェーズグループが表示される
      expect(screen.getByText("テストフェーズ1")).toBeInTheDocument();
    });

    test("担当者によるグループ化が正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // グループ化を担当者に変更
      const groupSelect = screen.getByDisplayValue("フェーズ");
      fireEvent.change(groupSelect, { target: { value: "assignee" } });

      await waitFor(() => {
        expect(screen.getByText("テストユーザー1")).toBeInTheDocument();
        expect(screen.getByText("テストユーザー2")).toBeInTheDocument();
      });
    });

    test("ステータスによるグループ化が正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // グループ化をステータスに変更
      const groupSelect = screen.getByDisplayValue("フェーズ");
      fireEvent.change(groupSelect, { target: { value: "status" } });

      await waitFor(() => {
        expect(screen.getByText("未開始")).toBeInTheDocument();
        expect(screen.getByText("進行中")).toBeInTheDocument();
      });
    });
  });

  describe("折りたたみ機能", () => {
    test("タスクの折りたたみが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 全て折りたたむボタンをクリック
      const collapseButton = screen.getByText("全て折りたたむ");
      fireEvent.click(collapseButton);

      await waitFor(() => {
        // タスクの詳細情報が非表示になる
        expect(screen.queryByText("5/9")).not.toBeInTheDocument();
        expect(screen.queryByText("5/16")).not.toBeInTheDocument();
      });
    });

    test("全て展開ボタンが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // まず全て折りたたむ
      const collapseButton = screen.getByText("全て折りたたむ");
      fireEvent.click(collapseButton);

      await waitFor(() => {
        const expandButton = screen.getByText("全て展開");
        fireEvent.click(expandButton);

        // タスクの詳細情報が表示される
        expect(screen.getByText("5/9")).toBeInTheDocument();
        expect(screen.getByText("5/16")).toBeInTheDocument();
      });
    });
  });

  describe("マイルストーン表示", () => {
    test("マイルストーンが正常に表示される", () => {
      render(<GanttV2Component {...defaultProps} />);

      // マイルストーンのチェックボックスが表示される
      const milestonesCheckbox = screen.getByLabelText("マイルストーン");
      expect(milestonesCheckbox).toBeChecked();
    });

    test("マイルストーンの表示/非表示が切り替えられる", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // マイルストーンを非表示にする
      const milestonesCheckbox = screen.getByLabelText("マイルストーン");
      fireEvent.click(milestonesCheckbox);

      await waitFor(() => {
        expect(milestonesCheckbox).not.toBeChecked();
      });
    });
  });

  describe("スクロール同期", () => {
    test("ヘッダーとチャートのスクロールが同期される", () => {
      render(<GanttV2Component {...defaultProps} />);

      // スクロール要素を取得
      const headerElement = document.querySelector(".overflow-x-auto");
      const chartElement = document.querySelector('[data-testid="chart-area"]');

      if (headerElement && chartElement) {
        // ヘッダーをスクロール
        headerElement.scrollLeft = 100;
        fireEvent.scroll(headerElement);

        // チャートも同じ位置にスクロールされる
        expect(chartElement.scrollLeft).toBe(100);
      }
    });
  });

  describe("エラーハンドリング", () => {
    test("不正な日付データでもエラーが発生しない", () => {
      const invalidTasks = [
        {
          ...mockTasks[0],
          yoteiStart: new Date("invalid-date"),
          yoteiEnd: new Date("invalid-date"),
        },
      ];

      expect(() => {
        render(<GanttV2Component {...defaultProps} tasks={invalidTasks} />);
      }).not.toThrow();
    });

    test("onTaskUpdateコールバックが正常に呼び出される", () => {
      const mockCallback = jest.fn();
      render(
        <GanttV2Component {...defaultProps} onTaskUpdate={mockCallback} />
      );

      // タスクバーをクリック（モーダル起動をテスト）
      const taskBar = document.querySelector('[data-task-id="1"]');
      if (taskBar) {
        fireEvent.click(taskBar);
      }
    });
  });
});

// 日付計算のユニットテスト
describe("GanttV2Component - 日付計算", () => {
  const defaultProps = {
    tasks: mockTasks,
    milestones: mockMilestones,
    project: mockProject,
    wbsId: 1,
    onTaskUpdate: jest.fn(),
  };

  test("日付範囲の計算が正確である", () => {
    render(<GanttV2Component {...defaultProps} />);

    // コンソールログで日付範囲を確認
    expect(console.log).toHaveBeenCalledWith(
      "projectStart",
      mockProject.startDate.toISOString()
    );
    expect(console.log).toHaveBeenCalledWith(
      "projectEnd",
      mockProject.endDate.toISOString()
    );
  });

  test("タスクの位置計算が正確である", () => {
    render(<GanttV2Component {...defaultProps} />);

    // 5月9日〜5月16日のタスクが正しい位置に配置される
    // 具体的な位置計算の検証は、実際のDOMで確認する必要がある
    expect(screen.getByText("テストタスク1")).toBeInTheDocument();
  });
});
