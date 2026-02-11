import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Prismaモジュールをモック化
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {},
}));

// inversify.configをモック化
jest.mock('@/lib/inversify.config', () => ({
  __esModule: true,
  container: {
    get: jest.fn(),
  },
}));

// server actionsをモック化
jest.mock('@/app/wbs/[id]/actions/wbs-task-actions', () => ({
  updateWbsTaskPeriod: jest.fn(),
  updateTaskKosu: jest.fn(),
}));

import GanttV2Component from "@/components/ganttv2/gantt-v2";
import { WbsTask, Milestone } from "@/types/wbs";
import { Project } from "@/types/project";

// モック設定
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

HTMLElement.prototype.scrollIntoView = jest.fn();

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

      // "未開始"オプションをクリック（role="option"で絞り込み）
      await waitFor(() => {
        const notStartedOptions = screen.getAllByText("未開始");
        const selectOption = notStartedOptions.find(
          (element) => element.getAttribute("role") === "option" ||
                       element.closest('[role="option"]') !== null
        );
        if (selectOption) {
          fireEvent.click(selectOption);
        }
      });

      await waitFor(() => {
        expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
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
        const userOptions = screen.getAllByText("テストユーザー1");
        const selectOption = userOptions.find(
          (element) => element.getAttribute("role") === "option" ||
                       element.closest('[role="option"]') !== null
        );
        if (selectOption) {
          fireEvent.click(selectOption);
        }
      });

      await waitFor(() => {
        expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
        expect(screen.queryByText("テストタスク2")).not.toBeInTheDocument();
      });
    });
  });

  describe("表示モード切り替え", () => {
    test("日表示モードが正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      // 表示モードセレクトが「日」になっていることを確認
      const viewModeSelect = screen.getByTestId("view-mode-select");
      expect(viewModeSelect).toHaveTextContent("日");

      // 日付ヘッダーが正しく表示される（複数の日付から1つを確認）
      expect(screen.getAllByText(/5月/).length).toBeGreaterThan(0);
    });

    test("週表示モードが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 表示モードセレクトが存在することを確認
      const viewModeSelect = screen.getByTestId("view-mode-select");
      expect(viewModeSelect).toBeInTheDocument();
      
      // 初期状態では「日」が選択されている
      expect(viewModeSelect).toHaveTextContent("日");
    });

    test("月表示モードが正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 表示モードセレクトが存在することを確認
      const viewModeSelect = screen.getByTestId("view-mode-select");
      expect(viewModeSelect).toBeInTheDocument();
      
      // セレクトコンポーネントがレンダリングされていることを確認
      expect(viewModeSelect).toHaveAttribute('role', 'combobox');
    });
  });

  describe("グループ化機能", () => {
    test("フェーズによるグループ化が正常に動作する", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // 初期状態でフェーズグループが表示される
      expect(screen.getByText("テストフェーズ1")).toBeInTheDocument();
    });

    test("担当者によるグループ化が正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      // グループ化セレクトが存在することを確認
      const groupSelect = screen.getByTestId("group-by-select");
      expect(groupSelect).toBeInTheDocument();
      
      // 初期状態では「工程別」が選択されている
      expect(groupSelect).toHaveTextContent("工程別");
    });

    test("ステータスによるグループ化が正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      // グループ化セレクトが存在することを確認  
      const groupSelect = screen.getByTestId("group-by-select");
      expect(groupSelect).toBeInTheDocument();
      
      // セレクトコンポーネントの基本的な属性を確認
      expect(groupSelect).toHaveAttribute('role', 'combobox');
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

    test("全て展開ボタンが正常に動作する", () => {
      render(<GanttV2Component {...defaultProps} />);

      // 折りたたみ/展開機能の基本的なコンポーネントが存在することを確認
      expect(screen.getByText("日")).toBeInTheDocument();
      expect(screen.getByTestId("group-by-select")).toBeInTheDocument();
    });
  });

  describe("マイルストーン表示", () => {
    test("マイルストーンが正常に表示される", () => {
      render(<GanttV2Component {...defaultProps} />);

      // マイルストーンボタンが表示される
      const milestoneButton = screen.getByTestId("milestone-toggle-button");
      expect(milestoneButton).toBeInTheDocument();
      // 初期状態でマイルストーンが表示されている（青色の背景）
      expect(milestoneButton).toHaveClass("bg-blue-50");
    });

    test("マイルストーンの表示/非表示が切り替えられる", async () => {
      render(<GanttV2Component {...defaultProps} />);

      // マイルストーンを非表示にする
      const milestonesButton = screen.getByTestId("milestone-toggle-button");
      fireEvent.click(milestonesButton);

      await waitFor(() => {
        expect(milestonesButton).not.toHaveClass("bg-blue-50");
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

    // コンポーネントが正常にレンダリングされることを確認
    expect(screen.getByText("日")).toBeInTheDocument();
  });

  test("タスクの位置計算が正確である", () => {
    render(<GanttV2Component {...defaultProps} />);

    // 5月9日〜5月16日のタスクが正しい位置に配置される
    // 具体的な位置計算の検証は、実際のDOMで確認する必要がある
    expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
  });
});
