import { describe, it, expect } from '@jest/globals';

describe('ガントチャート位置計算デバッグ', () => {
  // 実際の日付範囲でテスト
  const dateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };
  const chartWidth = 1000;

  describe('日付と位置の相互変換', () => {
    it('calculateTaskPositionsと同じ計算方法でタスク位置を計算', () => {
      // gantt-utils.tsのcalculateTaskPositionsと同じ計算
      const calculatePosition = (taskDate: Date) => {
        const normalizedRangeStart = new Date(dateRange.start);
        normalizedRangeStart.setHours(0, 0, 0, 0);

        const normalizedRangeEnd = new Date(dateRange.end);
        normalizedRangeEnd.setHours(0, 0, 0, 0);

        const totalDays = Math.ceil(
          (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
          (1000 * 60 * 60 * 24)
        );

        const normalizedTask = new Date(taskDate);
        normalizedTask.setHours(0, 0, 0, 0);

        const startDays = Math.max(
          0,
          Math.round(
            (normalizedTask.getTime() - normalizedRangeStart.getTime()) /
            (1000 * 60 * 60 * 24)
          )
        );

        const startPosition = (startDays / totalDays) * chartWidth;

        return {
          startDays,
          totalDays,
          startPosition,
          pixelsPerDay: chartWidth / totalDays,
        };
      };

      console.log('=== タスク位置計算 ===');
      const testDates = [
        new Date('2024-01-01'),
        new Date('2024-01-10'),
        new Date('2024-01-15'),
        new Date('2024-01-31'),
      ];

      testDates.forEach(date => {
        const result = calculatePosition(date);
        console.log(`${date.toISOString().split('T')[0]}:`);
        console.log(`  日数: ${result.startDays}/${result.totalDays}`);
        console.log(`  位置: ${result.startPosition.toFixed(2)}px`);
        console.log(`  1日あたり: ${result.pixelsPerDay.toFixed(2)}px`);
      });
    });

    it('positionToDate関数の逆計算', () => {
      // gantt-chart.tsxのpositionToDate関数と同じ計算
      const positionToDate = (position: number): Date => {
        const normalizedRangeStart = new Date(dateRange.start);
        normalizedRangeStart.setHours(0, 0, 0, 0);

        const normalizedRangeEnd = new Date(dateRange.end);
        normalizedRangeEnd.setHours(0, 0, 0, 0);

        const totalDays = Math.ceil(
          (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const dayPosition = (position / chartWidth) * totalDays;

        const resultDate = new Date(normalizedRangeStart);
        resultDate.setDate(resultDate.getDate() + Math.floor(dayPosition + 0.5));
        return resultDate;
      };

      console.log('\n=== 位置から日付への変換 ===');
      const testPositions = [0, 100, 322.58, 500, 1000];

      testPositions.forEach(position => {
        const date = positionToDate(position);
        console.log(`${position}px -> ${date.toISOString().split('T')[0]}`);
      });
    });

    it('ドラッグシミュレーション', () => {
      const positionToDate = (position: number): Date => {
        const normalizedRangeStart = new Date(dateRange.start);
        normalizedRangeStart.setHours(0, 0, 0, 0);

        const normalizedRangeEnd = new Date(dateRange.end);
        normalizedRangeEnd.setHours(0, 0, 0, 0);

        const totalDays = Math.ceil(
          (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const dayPosition = (position / chartWidth) * totalDays;

        const resultDate = new Date(normalizedRangeStart);
        resultDate.setDate(resultDate.getDate() + Math.floor(dayPosition + 0.5));
        return resultDate;
      };

      console.log('\n=== ドラッグシミュレーション ===');
      
      // 1月10日のタスクを50px右にドラッグ
      const originalPosition = 322.58; // 1月10日の位置（約）
      const dragDistance = 50;
      const newPosition = originalPosition + dragDistance;

      const originalDate = positionToDate(originalPosition);
      const newDate = positionToDate(newPosition);

      console.log(`元の位置: ${originalPosition}px -> ${originalDate.toISOString().split('T')[0]}`);
      console.log(`ドラッグ距離: ${dragDistance}px`);
      console.log(`新しい位置: ${newPosition}px -> ${newDate.toISOString().split('T')[0]}`);

      const daysDiff = Math.round(
        (newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`日数の差: ${daysDiff}日`);
    });

    it('日付計算の精度問題を検証', () => {
      console.log('\n=== 日付計算の精度問題 ===');
      
      const normalizedRangeStart = new Date(dateRange.start);
      normalizedRangeStart.setHours(0, 0, 0, 0);

      const normalizedRangeEnd = new Date(dateRange.end);
      normalizedRangeEnd.setHours(0, 0, 0, 0);

      const totalDays = Math.ceil(
        (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      console.log(`開始日: ${normalizedRangeStart.toISOString()}`);
      console.log(`終了日: ${normalizedRangeEnd.toISOString()}`);
      console.log(`総日数: ${totalDays}`);
      console.log(`1日あたりのピクセル: ${(chartWidth / totalDays).toFixed(2)}px`);

      // 端数の影響を確認
      const positions = [32.25, 32.26, 64.51, 64.52];
      positions.forEach(pos => {
        const dayPosition = (pos / chartWidth) * totalDays;
        console.log(`${pos}px -> 日位置: ${dayPosition.toFixed(4)} -> 丸め: ${Math.round(dayPosition)}`);
      });
    });
  });
});