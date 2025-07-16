/**
 * GanttV2Component の統合テスト
 * 実際の使用シナリオに基づいたテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GanttV2Component from '@/components/ganttv2/gantt-v2';
import {
  createMockProject,
  createMockTasks,
  createMockMilestones,
  createTaskWithPeriod,
  createTasksWithPhases,
  createTasksWithAssignees,
  createTasksWithStatuses,
  eventHelpers,
  domHelpers,
  assertionHelpers
} from '@/tests/helpers/gantt-test-helpers';

// モック設定
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
  get: function() { return this._scrollLeft || 0; },
  set: function(val) { this._scrollLeft = val; }
});

// コンソールログをモック
global.console.log = jest.fn();

describe('GanttV2Component - 統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('実際の使用シナリオ', () => {
    test('プロジェクト全体の流れを表示できる', async () => {
      const project = createMockProject({
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-07-31')
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
      expect(screen.getByText('要件定義')).toBeInTheDocument();
      expect(screen.getByText('設計')).toBeInTheDocument();
      expect(screen.getByText('実装')).toBeInTheDocument();
      
      // マイルストーンが表示される
      expect(screen.getByLabelText('マイルストーン')).toBeChecked();
    });

    test('大量のタスクでもパフォーマンスが維持される', () => {
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
      expect(screen.getByText('テストタスク1')).toBeInTheDocument();
      expect(screen.getByText('テストタスク100')).toBeInTheDocument();
    });

    test('複雑なフィルタリングとグループ化の組み合わせ', async () => {
      const project = createMockProject();
      const tasks = [
        ...createTasksWithAssignees(),
        ...createTasksWithStatuses()
      ];
      
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
      const groupSelect = screen.getByDisplayValue('フェーズ');
      fireEvent.change(groupSelect, { target: { value: 'assignee' } });
      
      await waitFor(() => {
        expect(screen.getByText('田中太郎')).toBeInTheDocument();
        expect(screen.getByText('佐藤花子')).toBeInTheDocument();
      });
      
      // ステータスでフィルタリング
      const statusSelect = screen.getByDisplayValue('すべて');
      fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } });
      
      await waitFor(() => {
        // 進行中のタスクのみ表示される
        expect(screen.getByText('テストタスク2')).toBeInTheDocument();
        expect(screen.queryByText('テストタスク1')).not.toBeInTheDocument();
      });
    });
  });

  describe('日付精度の検証', () => {
    test('5月9日〜5月16日のタスクが正確に表示される', () => {
      const project = createMockProject({
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31')
      });
      
      const testTask = createTaskWithPeriod(
        1,
        '2024-05-09',
        '2024-05-16',
        { name: 'test' }
      );
      
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
      expect(screen.getByText('test')).toBeInTheDocument();
      
      // 日付情報が正しく表示される
      expect(screen.getByText('5/9')).toBeInTheDocument();
      expect(screen.getByText('5/16')).toBeInTheDocument();
    });

    test('月跨ぎのタスクが正確に表示される', () => {
      const project = createMockProject({
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-06-30')
      });
      
      const crossMonthTask = createTaskWithPeriod(
        1,
        '2024-04-25',
        '2024-05-05',
        { name: '月跨ぎタスク' }
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
      
      expect(screen.getByText('月跨ぎタスク')).toBeInTheDocument();
      expect(screen.getByText('4/25')).toBeInTheDocument();
      expect(screen.getByText('5/5')).toBeInTheDocument();
    });

    test('同日開始終了のタスクが正確に表示される', () => {
      const project = createMockProject();
      const sameDayTask = createTaskWithPeriod(
        1,
        '2024-05-15',
        '2024-05-15',
        { name: '1日タスク' }
      );
      
      render(
        <GanttV2Component
          tasks={[sameDayTask]}
          milestones={[]}
          project={project}
          wbsId={1}
          onTaskUpdate={jest.fn()}
        />
      );
      
      expect(screen.getByText('1日タスク')).toBeInTheDocument();
      expect(screen.getByText('5/15')).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    test('表示モードの切り替えが正常に動作する', async () => {
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
      expect(screen.getByText('日')).toHaveClass('bg-blue-500');
      
      // 週表示に切り替え
      fireEvent.click(screen.getByText('週'));
      await waitFor(() => {
        expect(screen.getByText('週')).toHaveClass('bg-blue-500');
      });
      
      // 月表示に切り替え
      fireEvent.click(screen.getByText('月'));
      await waitFor(() => {
        expect(screen.getByText('月')).toHaveClass('bg-blue-500');
      });
    });

    test('折りたたみ機能が正常に動作する', async () => {
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
      
      // 初期状態では詳細情報が表示される
      expect(screen.getAllByText(/\d+\/\d+/).length).toBeGreaterThan(0);
      
      // 全て折りたたむ
      fireEvent.click(screen.getByText('全て折りたたむ'));
      
      await waitFor(() => {
        // 詳細情報が非表示になる
        expect(screen.queryAllByText(/\d+\/\d+/).length).toBe(0);
        // タスク名は表示される
        expect(screen.getByText('テストタスク1')).toBeInTheDocument();
      });
      
      // 全て展開
      fireEvent.click(screen.getByText('全て展開'));
      
      await waitFor(() => {
        // 詳細情報が再表示される
        expect(screen.getAllByText(/\d+\/\d+/).length).toBeGreaterThan(0);
      });
    });

    test('マイルストーンの表示切り替えが動作する', async () => {
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
      const milestoneCheckbox = screen.getByLabelText('マイルストーン');
      expect(milestoneCheckbox).toBeChecked();
      
      // マイルストーンを非表示にする
      fireEvent.click(milestoneCheckbox);
      
      await waitFor(() => {
        expect(milestoneCheckbox).not.toBeChecked();
      });
      
      // マイルストーンを再表示
      fireEvent.click(milestoneCheckbox);
      
      await waitFor(() => {
        expect(milestoneCheckbox).toBeChecked();
      });
    });
  });

  describe('レスポンシブ動作', () => {
    test('画面幅が狭い場合でも正常に表示される', () => {
      // 画面幅を狭く設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
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
      expect(screen.getByText('テストタスク1')).toBeInTheDocument();
      expect(screen.getByText('日')).toBeInTheDocument();
    });

    test('スクロール同期が正常に動作する', () => {
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
      const scrollableElements = document.querySelectorAll('.overflow-x-auto');
      
      expect(scrollableElements.length).toBeGreaterThan(0);
    });
  });

  describe('エラー境界とエッジケース', () => {
    test('不正なタスクデータでもクラッシュしない', () => {
      const project = createMockProject();
      const invalidTasks = [
        {
          id: 1,
          name: '不正タスク',
          status: 'INVALID_STATUS' as any,
          yoteiStart: new Date('invalid-date'),
          yoteiEnd: null as any,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
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

    test('空のプロジェクト期間でもエラーが発生しない', () => {
      const emptyProject = createMockProject({
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-01') // 開始日と終了日が同じ
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

    test('非常に大きな日付範囲でも正常に動作する', () => {
      const largeProject = createMockProject({
        startDate: new Date('2020-01-01'),
        endDate: new Date('2030-12-31') // 10年間のプロジェクト
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
      
      expect(screen.getByText('テストタスク1')).toBeInTheDocument();
    });
  });
});