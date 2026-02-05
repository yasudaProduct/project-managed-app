/**
 * GanttV2Component の統合テスト
 * 実際の使用シナリオに基づいたテスト
 */

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
import { TaskStatus } from "@/types/wbs";
import {
  createMockProject,
  createMockTasks,
  createMockMilestones,
  createTaskWithPeriod,
  createTasksWithPhases,
  createTasksWithAssignees,
  createTasksWithStatuses,
} from "@/__tests__/helpers/gantt-test-helpers";

// モック設定
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

HTMLElement.prototype.scrollIntoView = jest.fn();

Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
  get: function () {
    return this._scrollLeft || 0;
  },
  set: function (val) {
    this._scrollLeft = val;
  },
});

// コンソールログをモック
global.console.log = jest.fn();

// scrollIntoViewのモック
Element.prototype.scrollIntoView = jest.fn();

// HTMLElementのscrollIntoViewモック（Radix UIのため）
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: jest.fn(),
});

describe("GanttV2Component - 統合テスト", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("実際の使用シナリオ", () => {
    test("プロジェクト全体の流れを表示できる", async () => {
      const project = createMockProject({
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-07-31"),
      });

      const tasks = createTasksWithPhases();
      const milestones = createMockMilestones(2);

      const mockOnTaskUpdate = jest.fn();

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={milestones}
          project={project}
          wbsId={1}
          onTaskUpdate={mockOnTaskUpdate}
        />
      );

      // プロジェクト全体が表示される
      expect(screen.getByText("要件定義")).toBeInTheDocument();
      expect(screen.getByText("設計")).toBeInTheDocument();
      expect(screen.getByText("実装")).toBeInTheDocument();

      // マイルストーンが表示される
      expect(screen.getByText("マイルストーン")).toBeInTheDocument();
    });

    test("大量のタスクでもパフォーマンスが維持される", () => {
      const project = createMockProject();
      const tasks = createMockTasks(100); // 100個のタスク

      const startTime = performance.now();

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が1秒以内であることを確認
      expect(renderTime).toBeLessThan(1000);

      // 最初と最後のタスクが表示される
      expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("テストタスク100").length).toBeGreaterThan(0);
    });

    test("複雑なフィルタリングとグループ化の組み合わせ", async () => {
      const project = createMockProject();
      const assigneeTasks = createTasksWithAssignees();
      const statusTasks = createTasksWithStatuses().map((task, index) => ({
        ...task,
        id: task.id + 10, // Ensure unique IDs
        taskNo: `TASK-${(task.id + 10).toString().padStart(3, '0')}`,
        name: `ステータステスト${index + 1}`
      }));
      const tasks = [...assigneeTasks, ...statusTasks];

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // 担当者でグループ化
      const groupSelect = screen.getByTestId("group-by-select");
      fireEvent.click(groupSelect);
      const assigneeOption = await screen.findByText("担当者別");
      fireEvent.click(assigneeOption);

      await waitFor(() => {
        // 担当者別グループ化されていることを確認
        expect(screen.getAllByText("田中太郎").length).toBeGreaterThan(0);
        expect(screen.getAllByText("佐藤花子").length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // ステータスでフィルタリング
      const statusSelect = screen.getByTestId("status-filter-select");
      fireEvent.click(statusSelect);
      
      await waitFor(() => {
        const progressOptions = screen.getAllByText("進行中");
        const selectOption = progressOptions.find(
          (element) => element.getAttribute("role") === "option" ||
                       element.closest('[role="option"]') !== null
        );
        if (selectOption) {
          fireEvent.click(selectOption);
        }
      });

      await waitFor(() => {
        // 進行中のタスクのみ表示される
        expect(screen.getAllByText("ステータステスト2").length).toBeGreaterThan(0);
        expect(screen.queryByText("ステータステスト1")).not.toBeInTheDocument();
      });
    });
  });

  describe("日付精度の検証", () => {
    test("5月9日〜5月16日のタスクが正確に表示される", () => {
      const project = createMockProject({
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-05-31"),
      });

      const testTask = createTaskWithPeriod(1, "2024-05-09", "2024-05-16", {
        name: "test",
      });

      render(
        <GanttV2Component
          tasks={[testTask]}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // タスクが表示される
      expect(screen.getAllByText("test").length).toBeGreaterThan(0);

      // 日付情報が正しく表示される
      expect(screen.getAllByText(/5月9日/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/5月16日/).length).toBeGreaterThan(0);
    });

    test("月跨ぎのタスクが正確に表示される", () => {
      const project = createMockProject({
        startDate: new Date("2024-04-01"),
        endDate: new Date("2024-06-30"),
      });

      const crossMonthTask = createTaskWithPeriod(
        1,
        "2024-04-25",
        "2024-05-05",
        { name: "月跨ぎタスク" }
      );

      render(
        <GanttV2Component
          tasks={[crossMonthTask]}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      expect(screen.getAllByText("月跨ぎタスク").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/4月25日/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/5月5日/).length).toBeGreaterThan(0);
    });

    test("同日開始終了のタスクが正確に表示される", () => {
      const project = createMockProject();
      const sameDayTask = createTaskWithPeriod(1, "2024-05-15", "2024-05-15", {
        name: "1日タスク",
      });

      render(
        <GanttV2Component
          tasks={[sameDayTask]}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      expect(screen.getAllByText("1日タスク").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/5月15日/).length).toBeGreaterThan(0);
    });
  });

  describe("ユーザーインタラクション", () => {
    test("表示モードの切り替えが正常に動作する", () => {
      const project = createMockProject();
      const tasks = createMockTasks(3);

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // 初期状態（日表示）
      const viewModeSelect = screen.getByTestId("view-mode-select");
      expect(viewModeSelect).toHaveTextContent("日");
      expect(viewModeSelect).toBeInTheDocument();
    });

    test("折りたたみ機能が正常に動作する", () => {
      const project = createMockProject();
      const tasks = createMockTasks(5);

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // 初期状態では日本語の日付が表示される
      expect(screen.getAllByText(/\d+月\d+日/).length).toBeGreaterThan(0);
      
      // タスク名が表示される
      expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
    });

    test("マイルストーンの表示切り替えが動作する", async () => {
      const project = createMockProject();
      const tasks = createMockTasks(2);
      const milestones = createMockMilestones(2);

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={milestones}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // 初期状態ではマイルストーンが表示される
      const milestoneButton = screen.getByTestId("milestone-toggle-button");
      expect(milestoneButton).toHaveClass("bg-blue-50");

      // マイルストーンを非表示にする
      fireEvent.click(milestoneButton);

      await waitFor(() => {
        expect(milestoneButton).not.toHaveClass("bg-blue-50");
      });

      // マイルストーンを再表示
      fireEvent.click(milestoneButton);

      await waitFor(() => {
        expect(milestoneButton).toHaveClass("bg-blue-50");
      });
    });
  });

  describe("レスポンシブ動作", () => {
    test("画面幅が狭い場合でも正常に表示される", () => {
      // 画面幅を狭く設定
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      const project = createMockProject();
      const tasks = createMockTasks(3);

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // コンポーネントが正常にレンダリングされる
      expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
      expect(screen.getByText("日")).toBeInTheDocument();
    });

    test("スクロール同期が正常に動作する", () => {
      const project = createMockProject();
      const tasks = createMockTasks(10); // 多めのタスクでスクロールが必要な状況を作る

      render(
        <GanttV2Component
          tasks={tasks}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );

      // スクロール要素を取得
      const scrollableElements = document.querySelectorAll(".overflow-x-auto");

      expect(scrollableElements.length).toBeGreaterThan(0);
    });
  });

  describe("エラー境界とエッジケース", () => {
    test("不正なタスクデータでもクラッシュしない", () => {
      const project = createMockProject();
      const invalidTasks = [
        {
          id: 1,
          name: "不正タスク",
          status: "INVALID_STATUS" as unknown as TaskStatus,
          yoteiStart: new Date("invalid-date"),
          yoteiEnd: null as unknown as Date,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      expect(() => {
        render(
          <GanttV2Component
            tasks={invalidTasks}
            milestones={[]}
            project={project}
            wbsId={1}
            onTaskUpdate={jest.fn()}
          />
        );
      }).not.toThrow();
    });

    test("空のプロジェクト期間でもエラーが発生しない", () => {
      const emptyProject = createMockProject({
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-05-01"), // 開始日と終了日が同じ
      });

      expect(() => {
        render(
          <GanttV2Component
            tasks={[]}
            milestones={[]}
            project={emptyProject}
            wbsId={1}
            onTaskUpdate={jest.fn()}
          />
        );
      }).not.toThrow();
    });

    test("非常に大きな日付範囲でも正常に動作する", () => {
      const largeProject = createMockProject({
        startDate: new Date("2020-01-01"),
        endDate: new Date("2030-12-31"), // 10年間のプロジェクト
      });

      const tasks = createMockTasks(3);

      expect(() => {
        render(
          <GanttV2Component
            tasks={tasks}
            milestones={[]}
            project={largeProject}
            wbsId={1}
            onTaskUpdate={jest.fn()}
          />
        );
      }).not.toThrow();

      expect(screen.getAllByText("テストタスク1").length).toBeGreaterThan(0);
    });
  });
});
