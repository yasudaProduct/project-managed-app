/**
 * ガントチャートコンポーネントのテスト用ヘルパー関数
 */

import { WbsTask, Milestone } from '@/types/wbs';
import { Project } from '@/types/project';

/**
 * テスト用のプロジェクトデータを生成
 */
export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'test-project-1',
  name: 'テストプロジェクト',
  startDate: new Date('2024-05-01'),
  endDate: new Date('2024-05-31'),
  status: 'ACTIVE',
  description: 'テスト用プロジェクト',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

/**
 * テスト用のタスクデータを生成
 */
export const createMockTask = (id: number, overrides: Partial<WbsTask> = {}): WbsTask => ({
  id,
  taskNo: `TASK-${id.toString().padStart(3, '0')}`,
  name: `テストタスク${id}`,
  status: 'NOT_STARTED',
  assigneeId: 1,
  assignee: {
    id: 1,
    name: `テストユーザー${id}`,
    displayName: `テストユーザー${id}`
  },
  phaseId: 1,
  phase: {
    id: 1,
    name: 'テストフェーズ1',
    seq: 1
  },
  yoteiStart: new Date('2024-05-09'),
  yoteiEnd: new Date('2024-05-16'),
  yoteiKosu: 40,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

/**
 * テスト用のマイルストーンデータを生成
 */
export const createMockMilestone = (id: number, overrides: Partial<Milestone> = {}): Milestone => ({
  id,
  name: `テストマイルストーン${id}`,
  date: new Date('2024-05-15'),
  ...overrides
});

/**
 * 複数のタスクを生成
 */
export const createMockTasks = (count: number, baseOverrides: Partial<WbsTask> = {}): WbsTask[] => {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const startDate = new Date('2024-05-09');
    startDate.setDate(startDate.getDate() + index * 3); // 3日間隔でタスクを配置
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5); // 5日間のタスク
    
    return createMockTask(id, {
      yoteiStart: startDate,
      yoteiEnd: endDate,
      status: index % 3 === 0 ? 'NOT_STARTED' : index % 3 === 1 ? 'IN_PROGRESS' : 'COMPLETED',
      assigneeId: (index % 3) + 1,
      assignee: {
        id: (index % 3) + 1,
        name: `テストユーザー${(index % 3) + 1}`,
        displayName: `テストユーザー${(index % 3) + 1}`
      },
      ...baseOverrides
    });
  });
};

/**
 * 複数のマイルストーンを生成
 */
export const createMockMilestones = (count: number): Milestone[] => {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const date = new Date('2024-05-15');
    date.setDate(date.getDate() + index * 7); // 7日間隔でマイルストーンを配置
    
    return createMockMilestone(id, { date });
  });
};

/**
 * 特定の期間のタスクを生成
 */
export const createTaskWithPeriod = (
  id: number,
  startDate: string,
  endDate: string,
  overrides: Partial<WbsTask> = {}
): WbsTask => {
  return createMockTask(id, {
    yoteiStart: new Date(startDate),
    yoteiEnd: new Date(endDate),
    ...overrides
  });
};

/**
 * 異なるフェーズのタスクを生成
 */
export const createTasksWithPhases = (): WbsTask[] => {
  return [
    createMockTask(1, {
      phaseId: 1,
      phase: { id: 1, name: '要件定義', seq: 1 },
      yoteiStart: new Date('2024-05-01'),
      yoteiEnd: new Date('2024-05-10')
    }),
    createMockTask(2, {
      phaseId: 2,
      phase: { id: 2, name: '設計', seq: 2 },
      yoteiStart: new Date('2024-05-11'),
      yoteiEnd: new Date('2024-05-20')
    }),
    createMockTask(3, {
      phaseId: 3,
      phase: { id: 3, name: '実装', seq: 3 },
      yoteiStart: new Date('2024-05-21'),
      yoteiEnd: new Date('2024-05-31')
    })
  ];
};

/**
 * 異なる担当者のタスクを生成
 */
export const createTasksWithAssignees = (): WbsTask[] => {
  return [
    createMockTask(1, {
      assigneeId: 1,
      assignee: { id: 1, name: '田中太郎', displayName: '田中太郎' }
    }),
    createMockTask(2, {
      assigneeId: 2,
      assignee: { id: 2, name: '佐藤花子', displayName: '佐藤花子' }
    }),
    createMockTask(3, {
      assigneeId: 3,
      assignee: { id: 3, name: '鈴木次郎', displayName: '鈴木次郎' }
    })
  ];
};

/**
 * 異なるステータスのタスクを生成
 */
export const createTasksWithStatuses = (): WbsTask[] => {
  return [
    createMockTask(1, { status: 'NOT_STARTED' }),
    createMockTask(2, { status: 'IN_PROGRESS' }),
    createMockTask(3, { status: 'COMPLETED' })
  ];
};

/**
 * 日付計算のテスト用ヘルパー
 */
export const dateHelpers = {
  /**
   * 2つの日付の差分日数を計算
   */
  daysDifference: (date1: Date, date2: Date): number => {
    const normalized1 = new Date(date1);
    normalized1.setHours(0, 0, 0, 0);
    const normalized2 = new Date(date2);
    normalized2.setHours(0, 0, 0, 0);
    
    return Math.abs(
      Math.ceil((normalized2.getTime() - normalized1.getTime()) / (1000 * 60 * 60 * 24))
    );
  },

  /**
   * 日付を正規化（時刻部分を削除）
   */
  normalizeDate: (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  },

  /**
   * 日付範囲内の日数を計算
   */
  daysInRange: (startDate: Date, endDate: Date): number => {
    const start = dateHelpers.normalizeDate(startDate);
    const end = dateHelpers.normalizeDate(endDate);
    
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
};

/**
 * DOM要素のテスト用ヘルパー
 */
export const domHelpers = {
  /**
   * タスクバーの要素を取得
   */
  getTaskBar: (taskId: number): HTMLElement | null => {
    return document.querySelector(`[data-task-id="${taskId}"]`);
  },

  /**
   * タスクリストの行を取得
   */
  getTaskRow: (taskId: number): HTMLElement | null => {
    return document.querySelector(`[data-testid="task-row-${taskId}"]`);
  },

  /**
   * マイルストーンマーカーを取得
   */
  getMilestoneMarker: (milestoneId: number): HTMLElement | null => {
    return document.querySelector(`[data-milestone-id="${milestoneId}"]`);
  },

  /**
   * 時間軸のヘッダー要素を取得
   */
  getTimeAxisHeader: (): HTMLElement | null => {
    return document.querySelector('[data-testid="time-axis-header"]');
  },

  /**
   * チャートエリアの要素を取得
   */
  getChartArea: (): HTMLElement | null => {
    return document.querySelector('[data-testid="chart-area"]');
  }
};

/**
 * イベントのテスト用ヘルパー
 */
export const eventHelpers = {
  /**
   * マウスドラッグイベントをシミュレート
   */
  simulateDrag: (element: HTMLElement, startX: number, endX: number) => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: startX,
      clientY: 100,
      bubbles: true
    });
    
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: endX,
      clientY: 100,
      bubbles: true
    });
    
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: endX,
      clientY: 100,
      bubbles: true
    });
    
    element.dispatchEvent(mouseDownEvent);
    document.dispatchEvent(mouseMoveEvent);
    document.dispatchEvent(mouseUpEvent);
  },

  /**
   * スクロールイベントをシミュレート
   */
  simulateScroll: (element: HTMLElement, scrollLeft: number) => {
    element.scrollLeft = scrollLeft;
    const scrollEvent = new Event('scroll', { bubbles: true });
    element.dispatchEvent(scrollEvent);
  }
};

/**
 * アサーション用ヘルパー
 */
export const assertionHelpers = {
  /**
   * タスクバーの位置が期待値内にあるかチェック
   */
  expectTaskPosition: (
    taskElement: HTMLElement,
    expectedLeft: number,
    expectedWidth: number,
    tolerance: number = 5
  ) => {
    const rect = taskElement.getBoundingClientRect();
    const actualLeft = parseFloat(taskElement.style.left || '0');
    const actualWidth = parseFloat(taskElement.style.width || '0');
    
    expect(Math.abs(actualLeft - expectedLeft)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actualWidth - expectedWidth)).toBeLessThanOrEqual(tolerance);
  },

  /**
   * 日付が期待値と一致するかチェック（日付のみ）
   */
  expectDateEqual: (actual: Date, expected: Date) => {
    const actualNormalized = dateHelpers.normalizeDate(actual);
    const expectedNormalized = dateHelpers.normalizeDate(expected);
    
    expect(actualNormalized.getTime()).toBe(expectedNormalized.getTime());
  }
};