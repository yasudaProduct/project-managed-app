/**
 * 集計表のコピー/出力ユーティリティのテスト
 * - 工数は小数点第3位まで出力される
 * - 表示設定で非表示にした列は出力されない
 */
import {
  copyPhaseSummaryToClipboard,
  copyAssigneeSummaryToClipboard,
  copyMonthlyAssigneeSummaryToClipboard,
  copyMonthlyPhaseSummaryToClipboard,
  exportPhaseSummary,
  exportMonthlyPhaseSummary,
} from '@/utils/export-table';

const originalBlob = global.Blob;

let copiedText: string;
let exportedText: string;

beforeEach(() => {
  copiedText = '';
  exportedText = '';

  document.execCommand = jest.fn().mockImplementation(() => {
    const textarea = document.querySelector('textarea');
    copiedText = textarea?.value ?? '';
    return true;
  });

  // Blob の中身を検証するためのモック（jsdom では Blob の読み出しが扱いづらいため）
  global.Blob = jest.fn().mockImplementation((parts: string[]) => {
    exportedText = parts.join('');
    return { parts };
  }) as unknown as typeof Blob;

  URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
  URL.revokeObjectURL = jest.fn();
  jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  global.Blob = originalBlob;
  jest.restoreAllMocks();
});

const rowsOf = (tsv: string) => tsv.split('\n').map((line) => line.split('\t'));

describe('工程別集計表', () => {
  const data = [
    { phase: '設計', taskCount: 2, plannedHours: 10, actualHours: 8.5, difference: -1.5 },
  ];
  const total = { taskCount: 2, plannedHours: 10, actualHours: 8.5, difference: -1.5 };

  it('工数を小数点第3位まででコピーする', async () => {
    await copyPhaseSummaryToClipboard(data, total, 'hours');

    expect(rowsOf(copiedText)).toEqual([
      ['工程', 'タスク数', '予定工数(h)', '実績工数(h)', '差分'],
      ['設計', '2', '10.000', '8.500', '-1.500'],
      ['合計', '2', '10.000', '8.500', '-1.500'],
    ]);
  });

  it('単位変換後も小数点第3位まで出力する', async () => {
    await copyPhaseSummaryToClipboard(data, total, 'days');

    expect(rowsOf(copiedText)).toEqual([
      ['工程', 'タスク数', '予定工数(人日)', '実績工数(人日)', '差分'],
      ['設計', '2', '1.333', '1.133', '-0.200'],
      ['合計', '2', '1.333', '1.133', '-0.200'],
    ]);
  });

  it('非表示の列はコピーされない', async () => {
    await copyPhaseSummaryToClipboard(data, total, 'hours', {
      showPlanned: false,
      showDifference: false,
    });

    expect(rowsOf(copiedText)).toEqual([
      ['工程', 'タスク数', '実績工数(h)'],
      ['設計', '2', '8.500'],
      ['合計', '2', '8.500'],
    ]);
  });

  it('非表示の列は出力されず、工数は小数点第3位まで出力される', () => {
    exportPhaseSummary(data, total, 'tsv', 'hours', { showPlanned: false });

    expect(rowsOf(exportedText.replace('﻿', ''))).toEqual([
      ['工程', 'タスク数', '実績工数(h)', '差分'],
      ['設計', '2', '8.500', '-1.500'],
      ['合計', '2', '8.500', '-1.500'],
    ]);
  });
});

describe('担当者別集計表', () => {
  const data = [
    { assignee: '田中', taskCount: 1, plannedHours: 3.25, actualHours: 4, difference: 0.75 },
  ];
  const total = { taskCount: 1, plannedHours: 3.25, actualHours: 4, difference: 0.75 };

  it('工数を小数点第3位まででコピーする', async () => {
    await copyAssigneeSummaryToClipboard(data, total, 'hours');

    expect(rowsOf(copiedText)).toEqual([
      ['担当者', 'タスク数', '予定工数(h)', '実績工数(h)', '差分'],
      ['田中', '1', '3.250', '4.000', '0.750'],
      ['合計', '1', '3.250', '4.000', '0.750'],
    ]);
  });

  it('非表示の列はコピーされない', async () => {
    await copyAssigneeSummaryToClipboard(data, total, 'hours', {
      showPlanned: false,
    });

    expect(rowsOf(copiedText)[0]).toEqual([
      '担当者',
      'タスク数',
      '実績工数(h)',
      '差分',
    ]);
  });
});

describe('月別・担当者別集計表', () => {
  const monthlyData = {
    months: ['2024-01'],
    assignees: ['田中'],
    data: [
      {
        month: '2024-01',
        assignee: '田中',
        plannedHours: 10,
        actualHours: 8,
        difference: -2,
        baselineHours: 12,
        forecastHours: 9,
      },
    ],
    monthlyTotals: {
      '2024-01': {
        plannedHours: 10,
        actualHours: 8,
        difference: -2,
        baselineHours: 12,
        forecastHours: 9,
      },
    },
    assigneeTotals: {
      田中: {
        plannedHours: 10,
        actualHours: 8,
        difference: -2,
        baselineHours: 12,
        forecastHours: 9,
      },
    },
    grandTotal: {
      plannedHours: 10,
      actualHours: 8,
      difference: -2,
      baselineHours: 12,
      forecastHours: 9,
    },
  };

  it('表示中の列のみを小数点第3位までコピーする', async () => {
    await copyMonthlyAssigneeSummaryToClipboard(monthlyData, 'hours', {
      showBaseline: false,
      showPlanned: true,
      showActual: true,
      showForecast: true,
    });

    expect(rowsOf(copiedText)).toEqual([
      [
        '担当者',
        '2024-01_予定(h)',
        '2024-01_実績(h)',
        '2024-01_見通し(h)',
        '合計_予定(h)',
        '合計_実績(h)',
        '合計_見通し(h)',
      ],
      ['田中', '10.000', '8.000', '9.000', '10.000', '8.000', '9.000'],
      ['合計', '10.000', '8.000', '9.000', '10.000', '8.000', '9.000'],
    ]);
  });

  it('予定列を非表示にした場合は予定列がコピーされない', async () => {
    await copyMonthlyAssigneeSummaryToClipboard(monthlyData, 'hours', {
      showBaseline: true,
      showPlanned: false,
      showActual: true,
      showForecast: true,
    });

    expect(rowsOf(copiedText)[0]).toEqual([
      '担当者',
      '2024-01_基準(h)',
      '2024-01_実績(h)',
      '2024-01_見通し(h)',
      '合計_基準(h)',
      '合計_実績(h)',
      '合計_見通し(h)',
    ]);
    expect(rowsOf(copiedText)[1]).toEqual([
      '田中',
      '12.000',
      '8.000',
      '9.000',
      '12.000',
      '8.000',
      '9.000',
    ]);
  });
});

describe('月別・工程別集計表', () => {
  const cell = {
    taskCount: 1,
    plannedHours: 10,
    actualHours: 8,
    difference: -2,
    baselineHours: 12,
    forecastHours: 9,
  };
  const monthlyPhaseData = {
    months: ['2024-01'],
    phases: ['設計'],
    cells: new Map([['2024-01|設計', cell]]),
    monthlyTotals: { '2024-01': cell },
    phaseTotals: { 設計: cell },
    grandTotal: cell,
  };

  it('表示中の列のみを小数点第3位までコピーする', async () => {
    await copyMonthlyPhaseSummaryToClipboard(monthlyPhaseData, 'hours', {
      showBaseline: true,
      showPlanned: false,
      showActual: true,
      showForecast: false,
    });

    expect(rowsOf(copiedText)).toEqual([
      ['工程', '2024-01_基準(h)', '2024-01_実績(h)', '合計_基準(h)', '合計_実績(h)'],
      ['設計', '12.000', '8.000', '12.000', '8.000'],
      ['合計', '12.000', '8.000', '12.000', '8.000'],
    ]);
  });

  it('表示中の列のみを小数点第3位まで出力する', () => {
    exportMonthlyPhaseSummary(monthlyPhaseData, 'tsv', 'hours', {
      showBaseline: false,
      showPlanned: true,
      showActual: true,
      showForecast: false,
    });

    expect(rowsOf(exportedText.replace('﻿', ''))).toEqual([
      ['工程', '2024-01_予定(h)', '2024-01_実績(h)', '合計_予定(h)', '合計_実績(h)'],
      ['設計', '10.000', '8.000', '10.000', '8.000'],
      ['合計', '10.000', '8.000', '10.000', '8.000'],
    ]);
  });
});
