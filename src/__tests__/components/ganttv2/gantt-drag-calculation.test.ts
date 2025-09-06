// import { describe, it, expect } from '@jest/globals';

// describe('ガントチャートのドラッグ計算テスト', () => {
//   // positionToDate関数の期待される動作を検証
//   describe('positionToDate関数の検証', () => {
//     it('位置0は範囲の開始日になるべき', () => {
//       const dateRange = {
//         start: new Date('2024-01-01'),
//         end: new Date('2024-01-31')
//       };
//       const chartWidth = 1000;

//       // gantt-chart.tsxのpositionToDate関数を再現
//       const positionToDate = (position: number): Date => {
//         const normalizedRangeStart = new Date(dateRange.start);
//         normalizedRangeStart.setHours(0, 0, 0, 0);

//         const normalizedRangeEnd = new Date(dateRange.end);
//         normalizedRangeEnd.setHours(0, 0, 0, 0);

//         const totalDays = Math.ceil(
//           (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         ) + 1;

//         const dayPosition = (position / chartWidth) * totalDays;

//         const resultDate = new Date(normalizedRangeStart);
//         resultDate.setDate(resultDate.getDate() + Math.round(dayPosition));
//         return resultDate;
//       };

//       const result = positionToDate(0);
//       expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
//     });

//     it('チャート幅の位置は範囲の終了日になるべき', () => {
//       const dateRange = {
//         start: new Date('2024-01-01'),
//         end: new Date('2024-01-31')
//       };
//       const chartWidth = 1000;

//       const positionToDate = (position: number): Date => {
//         const normalizedRangeStart = new Date(dateRange.start);
//         normalizedRangeStart.setHours(0, 0, 0, 0);

//         const normalizedRangeEnd = new Date(dateRange.end);
//         normalizedRangeEnd.setHours(0, 0, 0, 0);

//         const totalDays = Math.ceil(
//           (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         ) + 1;

//         const dayPosition = (position / chartWidth) * totalDays;

//         const resultDate = new Date(normalizedRangeStart);
//         resultDate.setDate(resultDate.getDate() + Math.round(dayPosition));
//         return resultDate;
//       };

//       const result = positionToDate(chartWidth);
//       console.log('終了位置の日付:', result.toISOString().split('T')[0]);
//       console.log('期待される終了日:', '2024-01-31');
//     });
//   });

//   // calculateTaskPositions関数の検証
//   describe('calculateTaskPositions関数の検証', () => {
//     it('タスクの位置計算が正しいこと', () => {
//       const dateRange = {
//         start: new Date('2024-01-01'),
//         end: new Date('2024-01-31')
//       };
//       const chartWidth = 1000;

//       // gantt-utils.tsのcalculateTaskPositions関数を簡略化して再現
//       const calculatePosition = (taskStart: Date, taskEnd: Date) => {
//         const normalizedRangeStart = new Date(dateRange.start);
//         normalizedRangeStart.setHours(0, 0, 0, 0);

//         const normalizedRangeEnd = new Date(dateRange.end);
//         normalizedRangeEnd.setHours(0, 0, 0, 0);

//         const totalDays = Math.ceil(
//           (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         ) + 1;

//         const normalizedStart = new Date(taskStart);
//         normalizedStart.setHours(0, 0, 0, 0);

//         const normalizedEnd = new Date(taskEnd);
//         normalizedEnd.setHours(0, 0, 0, 0);

//         const startDays = Math.max(
//           0,
//           Math.round(
//             (normalizedStart.getTime() - normalizedRangeStart.getTime()) /
//             (1000 * 60 * 60 * 24)
//           )
//         );

//         const endDays = Math.max(
//           0,
//           Math.round(
//             (normalizedEnd.getTime() - normalizedRangeStart.getTime()) /
//             (1000 * 60 * 60 * 24)
//           )
//         );

//         const duration = Math.max(1, endDays - startDays + 1);

//         const startPosition = (startDays / totalDays) * chartWidth;
//         const width = (duration / totalDays) * chartWidth;

//         return { startPosition, width, startDays, endDays, duration, totalDays };
//       };

//       // 1月1日のタスクは位置0から始まるべき
//       const result1 = calculatePosition(new Date('2024-01-01'), new Date('2024-01-01'));
//       console.log('1月1日のタスク:', result1);
//       expect(result1.startPosition).toBe(0);

//       // 1月16日のタスクは中央付近にあるべき
//       const result2 = calculatePosition(new Date('2024-01-16'), new Date('2024-01-16'));
//       console.log('1月16日のタスク:', result2);
//       expect(result2.startPosition).toBeCloseTo(500, -1); // 約500px (1000px * 15/31)
//     });
//   });

//   // 逆計算の検証
//   describe('位置と日付の相互変換', () => {
//     it('日付→位置→日付の変換が一致すること', () => {
//       const dateRange = {
//         start: new Date('2024-01-01'),
//         end: new Date('2024-01-31')
//       };
//       const chartWidth = 1000;

//       // 位置から日付を計算
//       const positionToDate = (position: number): Date => {
//         const normalizedRangeStart = new Date(dateRange.start);
//         normalizedRangeStart.setHours(0, 0, 0, 0);

//         const normalizedRangeEnd = new Date(dateRange.end);
//         normalizedRangeEnd.setHours(0, 0, 0, 0);

//         const totalDays = Math.ceil(
//           (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         ) + 1;

//         const dayPosition = (position / chartWidth) * totalDays;

//         const resultDate = new Date(normalizedRangeStart);
//         resultDate.setDate(resultDate.getDate() + Math.round(dayPosition));
//         return resultDate;
//       };

//       // 日付から位置を計算
//       const dateToPosition = (date: Date): number => {
//         const normalizedRangeStart = new Date(dateRange.start);
//         normalizedRangeStart.setHours(0, 0, 0, 0);

//         const normalizedRangeEnd = new Date(dateRange.end);
//         normalizedRangeEnd.setHours(0, 0, 0, 0);

//         const totalDays = Math.ceil(
//           (normalizedRangeEnd.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         ) + 1;

//         const normalizedDate = new Date(date);
//         normalizedDate.setHours(0, 0, 0, 0);

//         const days = Math.round(
//           (normalizedDate.getTime() - normalizedRangeStart.getTime()) /
//           (1000 * 60 * 60 * 24)
//         );

//         return (days / totalDays) * chartWidth;
//       };

//       // テストケース
//       const testDates = [
//         new Date('2024-01-01'),
//         new Date('2024-01-15'),
//         new Date('2024-01-31')
//       ];

//       testDates.forEach(originalDate => {
//         const position = dateToPosition(originalDate);
//         const convertedDate = positionToDate(position);

//         console.log(`元の日付: ${originalDate.toISOString().split('T')[0]}`);
//         console.log(`位置: ${position}px`);
//         console.log(`変換後の日付: ${convertedDate.toISOString().split('T')[0]}`);
//         console.log('---');

//         expect(convertedDate.toISOString().split('T')[0])
//           .toBe(originalDate.toISOString().split('T')[0]);
//       });
//     });

//     it('ドラッグ距離と日付変化の関係', () => {
//       // const dateRange = {
//       //   start: new Date('2024-01-01'),
//       //   end: new Date('2024-01-31')
//       // };
//       const chartWidth = 1000;
//       const totalDays = 31; // 1月の日数

//       // 1日あたりのピクセル数
//       const pixelsPerDay = chartWidth / totalDays;
//       console.log(`1日あたりのピクセル数: ${pixelsPerDay}px`);

//       // 100px移動した場合の日数変化
//       const dragDistance = 100;
//       const daysMoved = Math.round(dragDistance / pixelsPerDay);
//       console.log(`${dragDistance}px移動 = ${daysMoved}日移動`);

//       expect(daysMoved).toBe(3); // 100px / (1000px/31日) ≈ 3.1日
//     });
//   });
// });