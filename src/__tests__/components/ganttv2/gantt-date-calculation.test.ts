import { describe, it } from '@jest/globals';

describe('ガントチャート日付計算の検証', () => {
  const chartWidth = 1000;
  const dateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  // タスクの位置から日付範囲を計算
  describe('タスクの幅と日付範囲の関係', () => {
    it('1日のタスク（1月10日）の幅計算', () => {
      // 1月10日の1日タスク
      // const taskStart = new Date('2024-01-10');
      // const taskEnd = new Date('2024-01-10');

      const normalizedRangeStart = new Date(dateRange.start);
      normalizedRangeStart.setHours(0, 0, 0, 0);

      const normalizedRangeEnd = new Date(dateRange.end);
      normalizedRangeEnd.setHours(0, 0, 0, 0);

      const totalDays = Math.ceil(
        (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // 開始位置の計算
      const startDays = 9; // 1月1日から1月10日まで9日
      const startPosition = (startDays / totalDays) * chartWidth;

      // 期間の計算（終了日を含む）
      const duration = 1; // 1日のタスク
      const width = (duration / totalDays) * chartWidth;

      console.log('1日タスク（1月10日）:');
      console.log(`  開始位置: ${startPosition.toFixed(2)}px`);
      console.log(`  幅: ${width.toFixed(2)}px`);
      console.log(`  総日数: ${totalDays}`);
    });

    it('5日のタスク（1月10日〜1月14日）の幅計算', () => {
      // const taskStart = new Date('2024-01-10');
      // const taskEnd = new Date('2024-01-14');

      const normalizedRangeStart = new Date(dateRange.start);
      normalizedRangeStart.setHours(0, 0, 0, 0);

      const normalizedRangeEnd = new Date(dateRange.end);
      normalizedRangeEnd.setHours(0, 0, 0, 0);

      const totalDays = Math.ceil(
        (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // 開始位置の計算
      const startDays = 9; // 1月1日から1月10日まで9日
      const endDays = 13; // 1月1日から1月14日まで13日
      const startPosition = (startDays / totalDays) * chartWidth;

      // 期間の計算（終了日を含む）
      const duration = endDays - startDays + 1; // 5日
      const width = (duration / totalDays) * chartWidth;

      console.log('\n5日タスク（1月10日〜14日）:');
      console.log(`  開始位置: ${startPosition.toFixed(2)}px`);
      console.log(`  幅: ${width.toFixed(2)}px`);
      console.log(`  期間: ${duration}日`);
    });
  });

  describe('位置から日付への逆計算', () => {
    it('タスクの終了位置から終了日を計算', () => {
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

      // 1日タスクの場合
      const startPos1 = 300; // 1月10日の位置
      const width1 = 33.33; // 1日の幅

      console.log('\n1日タスクの終了日計算:');
      console.log(`  開始位置: ${startPos1}px -> ${positionToDate(startPos1).toISOString().split('T')[0]}`);
      console.log(`  終了位置: ${startPos1 + width1}px -> ${positionToDate(startPos1 + width1).toISOString().split('T')[0]}`);
      console.log(`  終了位置-1: ${startPos1 + width1 - 1}px -> ${positionToDate(startPos1 + width1 - 1).toISOString().split('T')[0]}`);

      // 5日タスクの場合
      const startPos5 = 300; // 1月10日の位置
      const width5 = 166.67; // 5日の幅

      console.log('\n5日タスクの終了日計算:');
      console.log(`  開始位置: ${startPos5}px -> ${positionToDate(startPos5).toISOString().split('T')[0]}`);
      console.log(`  終了位置: ${startPos5 + width5}px -> ${positionToDate(startPos5 + width5).toISOString().split('T')[0]}`);
      console.log(`  終了位置-1: ${startPos5 + width5 - 1}px -> ${positionToDate(startPos5 + width5 - 1).toISOString().split('T')[0]}`);
    });

    it('端数処理の影響を確認', () => {
      const totalDays = 30;
      const pixelsPerDay = chartWidth / totalDays;

      console.log('\n端数処理の影響:');
      console.log(`  1日あたりのピクセル: ${pixelsPerDay.toFixed(2)}px`);

      // 各日の境界位置を確認
      for (let day = 0; day <= 5; day++) {
        const position = day * pixelsPerDay;
        console.log(`  ${day}日目の位置: ${position.toFixed(2)}px`);
      }
    });
  });
});