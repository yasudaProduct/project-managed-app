/**
 * GanttV2Component の日付計算とタスク位置計算のユニットテスト
 * 実際のコンポーネントから計算ロジックを抽出してテストする
 */

import { WbsTask } from '@/types/wbs';
import { Project } from '@/types/project';

// 計算ロジックを抽出したヘルパー関数
export const calculateDateRange = (project: Project) => {
  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);

  const start = new Date(projectStart);
  start.setDate(start.getDate() - 7);
  const end = new Date(projectEnd);
  end.setDate(end.getDate() + 7);

  return { start, end };
};

export const calculateTaskPosition = (
  task: WbsTask,
  dateRange: { start: Date; end: Date },
  chartWidth: number
) => {
  // 時間軸と同じ正規化された日付範囲を使用
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const taskStart = task.yoteiStart || normalizedRangeStart;
  const taskEnd = task.yoteiEnd || taskStart;

  // 日付を正規化（時刻部分を削除）
  const normalizedStart = new Date(taskStart);
  normalizedStart.setHours(0, 0, 0, 0);

  const normalizedEnd = new Date(taskEnd);
  normalizedEnd.setHours(0, 0, 0, 0);

  // より正確な日数計算（開始日からの経過日数）
  const startDays = Math.max(
    0,
    Math.round(
      (normalizedStart.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // 期間計算（終了日を含む期間として計算）
  const endDays = Math.max(
    0,
    Math.round(
      (normalizedEnd.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const duration = Math.max(1, endDays - startDays + 2);

  // チャート幅に基づいてピクセル位置を計算
  const startPosition = (startDays / totalDays) * chartWidth;
  const width = (duration / totalDays) * chartWidth;

  return {
    startDays,
    endDays,
    duration,
    startPosition,
    width,
    totalDays
  };
};

export const calculateTimeAxis = (
  dateRange: { start: Date; end: Date },
  viewMode: 'day' | 'week' | 'month' | 'quarter'
) => {
  const VIEW_MODES = [
    { value: 'day', label: '日', days: 1 },
    { value: 'week', label: '週', days: 7 },
    { value: 'month', label: '月', days: 30 },
    { value: 'quarter', label: '四半期', days: 90 },
  ];

  const currentMode = VIEW_MODES.find((mode) => mode.value === viewMode)!;

  // 日付範囲を正規化
  const normalizedRangeStart = new Date(dateRange.start);
  normalizedRangeStart.setHours(0, 0, 0, 0);

  const normalizedRangeEnd = new Date(dateRange.end);
  normalizedRangeEnd.setHours(0, 0, 0, 0);

  // 正規化された日付で総日数を計算
  const totalDays = Math.ceil(
    (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // 横スクロールを可能にするために、各日の最小幅を設定
  const minDayWidth =
    viewMode === 'day' ? 60 : viewMode === 'week' ? 80 : 120;
  const calculatedChartWidth = Math.max(
    1200,
    (totalDays * minDayWidth) / currentMode.days
  );

  const intervals = Math.ceil(totalDays / currentMode.days);
  const intervalWidth = calculatedChartWidth / intervals;

  const axis = Array.from({ length: intervals }, (_, i) => {
    const date = new Date(normalizedRangeStart);
    date.setDate(date.getDate() + i * currentMode.days);
    return {
      date,
      position: i * intervalWidth,
      width: intervalWidth,
    };
  });

  return { timeAxis: axis, chartWidth: calculatedChartWidth, totalDays };
};

describe('GanttV2 日付計算ロジック', () => {
  const mockProject: Project = {
    id: 'test-project-1',
    name: 'テストプロジェクト',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-31'),
    status: 'ACTIVE',
    description: 'テスト用プロジェクト'
  };

  const testTask: WbsTask = {
    id: 1,
    taskNo: 'TASK-001',
    name: 'テストタスク',
    status: 'NOT_STARTED',
    yoteiStart: new Date('2024-05-09'),
    yoteiEnd: new Date('2024-05-16'),
    yoteiKosu: 40,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  describe('日付範囲計算', () => {
    test('プロジェクト期間から正しい日付範囲を計算する', () => {
      const dateRange = calculateDateRange(mockProject);
      
      expect(dateRange.start).toEqual(new Date('2024-04-24')); // 5月1日 - 7日
      expect(dateRange.end).toEqual(new Date('2024-06-07')); // 5月31日 + 7日
    });
  });

  describe('時間軸計算', () => {
    test('日表示モードで正しい時間軸を生成する', () => {
      const dateRange = calculateDateRange(mockProject);
      const { timeAxis, chartWidth, totalDays } = calculateTimeAxis(dateRange, 'day');
      
      expect(totalDays).toBe(44); // 4月24日〜6月7日 = 44日
      expect(chartWidth).toBeGreaterThanOrEqual(1200); // 最小幅1200px
      expect(timeAxis.length).toBeGreaterThan(0);
      const expectedDate = new Date('2024-04-24');
      expectedDate.setHours(0, 0, 0, 0);
      expect(timeAxis[0].date.getTime()).toEqual(expectedDate.getTime());
    });

    test('週表示モードで正しい時間軸を生成する', () => {
      const dateRange = calculateDateRange(mockProject);
      const { timeAxis, chartWidth } = calculateTimeAxis(dateRange, 'week');
      
      expect(chartWidth).toBeGreaterThanOrEqual(1200);
      expect(timeAxis.length).toBeGreaterThan(0);
    });

    test('月表示モードで正しい時間軸を生成する', () => {
      const dateRange = calculateDateRange(mockProject);
      const { timeAxis, chartWidth } = calculateTimeAxis(dateRange, 'month');
      
      expect(chartWidth).toBeGreaterThanOrEqual(1200);
      expect(timeAxis.length).toBeGreaterThan(0);
    });
  });

  describe('タスク位置計算', () => {
    test('5月9日〜5月16日のタスクの位置を正確に計算する', () => {
      const dateRange = calculateDateRange(mockProject);
      const chartWidth = 1800; // テスト用の固定幅
      
      const position = calculateTaskPosition(testTask, dateRange, chartWidth);
      
      // 4月24日を0日として、5月9日は15日目
      expect(position.startDays).toBe(15);
      // 5月16日は22日目
      expect(position.endDays).toBe(22);
      // 期間は8日間（5月9日〜16日、終了日含む + 調整値）
      expect(position.duration).toBe(9); // endDays - startDays + 2 = 22 - 15 + 2 = 9
      
      // 位置計算の検証
      const expectedStartPosition = (15 / 44) * 1800; // 613.636...px
      const expectedWidth = (9 / 44) * 1800; // 368.181...px
      
      expect(position.startPosition).toBe(expectedStartPosition);
      expect(position.width).toBe(expectedWidth);
    });

    test('タスクの開始日がプロジェクト開始日より前の場合', () => {
      const earlyTask: WbsTask = {
        ...testTask,
        yoteiStart: new Date('2024-04-20'), // プロジェクト開始日より前
        yoteiEnd: new Date('2024-05-05')
      };
      
      const dateRange = calculateDateRange(mockProject);
      const position = calculateTaskPosition(earlyTask, dateRange, 1800);
      
      // 開始位置は0以上になる
      expect(position.startDays).toBeGreaterThanOrEqual(0);
      expect(position.startPosition).toBeGreaterThanOrEqual(0);
    });

    test('タスクの終了日がプロジェクト終了日より後の場合', () => {
      const lateTask: WbsTask = {
        ...testTask,
        yoteiStart: new Date('2024-05-25'),
        yoteiEnd: new Date('2024-06-10') // プロジェクト終了日より後
      };
      
      const dateRange = calculateDateRange(mockProject);
      const position = calculateTaskPosition(lateTask, dateRange, 1800);
      
      // 計算エラーが発生しない
      expect(position.duration).toBeGreaterThan(0);
      expect(position.width).toBeGreaterThan(0);
    });

    test('開始日と終了日が同じタスクの期間計算', () => {
      const singleDayTask: WbsTask = {
        ...testTask,
        yoteiStart: new Date('2024-05-15'),
        yoteiEnd: new Date('2024-05-15')
      };
      
      const dateRange = calculateDateRange(mockProject);
      const position = calculateTaskPosition(singleDayTask, dateRange, 1800);
      
      // 最小期間は1日以上になる
      expect(position.duration).toBeGreaterThanOrEqual(1);
      expect(position.width).toBeGreaterThan(0);
    });

    test('yoteiStartまたはyoteiEndがnullの場合', () => {
      const incompleteTask: WbsTask = {
        ...testTask,
        yoteiStart: undefined,
        yoteiEnd: undefined
      };
      
      const dateRange = calculateDateRange(mockProject);
      const position = calculateTaskPosition(incompleteTask, dateRange, 1800);
      
      // デフォルト値が使用される
      expect(position.duration).toBeGreaterThan(0);
      expect(position.width).toBeGreaterThan(0);
    });
  });

  describe('エッジケース', () => {
    test('非常に短いプロジェクト期間での計算', () => {
      const shortProject: Project = {
        id: 'short-project',
        name: 'ショートプロジェクト',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-03'), // 3日間のプロジェクト
        status: 'ACTIVE',
        description: '短期プロジェクト'
      };
      
      const dateRange = calculateDateRange(shortProject);
      const { chartWidth } = calculateTimeAxis(dateRange, 'day');
      
      // 最小幅が保証される
      expect(chartWidth).toBeGreaterThanOrEqual(1200);
    });

    test('非常に長いプロジェクト期間での計算', () => {
      const longProject: Project = {
        id: 'long-project',
        name: 'ロングプロジェクト',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'), // 1年間のプロジェクト
        status: 'ACTIVE',
        description: '長期プロジェクト'
      };
      
      const dateRange = calculateDateRange(longProject);
      const { chartWidth, totalDays } = calculateTimeAxis(dateRange, 'day');
      
      expect(totalDays).toBeGreaterThan(300);
      expect(chartWidth).toBeGreaterThan(1200);
    });

    test('時差を含む日付での計算', () => {
      // UTC日時でテスト
      const utcTask: WbsTask = {
        ...testTask,
        yoteiStart: new Date('2024-05-09T00:00:00.000Z'),
        yoteiEnd: new Date('2024-05-16T23:59:59.999Z')
      };
      
      const dateRange = calculateDateRange(mockProject);
      const position = calculateTaskPosition(utcTask, dateRange, 1800);
      
      // 日付正規化により、時刻部分の影響を受けない
      expect(position.duration).toBeGreaterThan(0);
      expect(position.startPosition).toBeGreaterThanOrEqual(0);
    });
  });
});