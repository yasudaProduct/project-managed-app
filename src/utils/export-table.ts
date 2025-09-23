import { HoursUnit, convertHours, getUnitSuffix } from './hours-converter';

interface ExportOptions {
  filename: string;
  format: 'csv' | 'tsv';
}

/**
 * クリップボードにコピー
 * @param headers ヘッダー
 * @param rows データ
 */
async function copyToClipboard(
  headers: string[],
  rows: (string | number | undefined | null)[][],
): Promise<void> {
  const formatCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '';
    return String(cell);
  };

  // ヘッダーとデータを結合
  const headerRow = headers.map(formatCell).join('\t');
  const dataRows = rows.map(row => row.map(formatCell).join('\t'));
  const content = [headerRow, ...dataRows].join('\n');

  // クリップボードにコピー
  await navigator.clipboard.writeText(content);

}

/**
 * テーブルデータをエクスポート
 * @param headers ヘッダー
 * @param rows データ
 * @param options オプション
 */
function exportTableData(
  headers: string[],
  rows: (string | number | undefined | null)[][],
  options: ExportOptions
): void {
  const delimiter = options.format === 'csv' ? ',' : '\t';
  const extension = options.format === 'csv' ? '.csv' : '.tsv';

  // セルをフォーマット
  const formatCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '';
    const value = String(cell);

    if (options.format === 'csv' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // ヘッダーとデータを結合
  const headerRow = headers.map(formatCell).join(delimiter);
  const dataRows = rows.map(row => row.map(formatCell).join(delimiter));
  const content = [headerRow, ...dataRows].join('\n');

  // BOM付きのBlobを作成
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  // ダウンロードリンクを作成
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename + extension;
  // ダウンロードリンクをクリック
  document.body.appendChild(link);
  link.click();
  // ダウンロードリンクを削除
  document.body.removeChild(link);
  // ダウンロードリンクを破棄
  URL.revokeObjectURL(url);
}

interface PhaseSummaryData {
  phase: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

/**
 * 工程別集計表をクリップボードにコピー
 * @param data 
 * @param total 
 * @param unit 
 */
export async function copyPhaseSummaryToClipboard(
  data: PhaseSummaryData[],
  total: Omit<PhaseSummaryData, 'phase'>,
  unit: HoursUnit = 'hours'
): Promise<void> {
  const unitSuffix = getUnitSuffix(unit);
  const headers = ['工程', 'タスク数', `予定工数(${unitSuffix})`, `実績工数(${unitSuffix})`, '差分'];
  // データを作成
  const rows = [
    ...data.map(item => [
      item.phase,
      item.taskCount,
      convertHours(item.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(item.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(item.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]),
    ['合計', total.taskCount,
      convertHours(total.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(total.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(total.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]
  ];

  // クリップボードにコピー
  await copyToClipboard(headers, rows);
}

/**
 * 工程別集計表をエクスポート
 * @param data データ
 * @param total 合計
 * @param format フォーマット
 * @param unit 単位
 */
export function exportPhaseSummary(
  data: PhaseSummaryData[],
  total: Omit<PhaseSummaryData, 'phase'>,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours'
): void {
  const unitSuffix = getUnitSuffix(unit);
  const headers = ['工程', 'タスク数', `予定工数(${unitSuffix})`, `実績工数(${unitSuffix})`, '差分'];
  const rows = [
    ...data.map(item => [
      item.phase,
      item.taskCount,
      convertHours(item.plannedHours, unit),
      convertHours(item.actualHours, unit),
      convertHours(item.difference, unit)
    ]),
    ['合計', total.taskCount, convertHours(total.plannedHours, unit), convertHours(total.actualHours, unit), convertHours(total.difference, unit)]
  ];

  exportTableData(headers, rows, {
    filename: `工程別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}

interface AssigneeSummaryData {
  assignee: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

/**
 * 担当者別集計表をクリップボードにコピー
 * @param data 
 * @param total 
 * @param unit 
 */
export async function copyAssigneeSummaryToClipboard(
  data: AssigneeSummaryData[],
  total: Omit<AssigneeSummaryData, 'assignee'>,
  unit: HoursUnit = 'hours'
): Promise<void> {
  const unitSuffix = getUnitSuffix(unit);
  const headers = ['担当者', 'タスク数', `予定工数(${unitSuffix})`, `実績工数(${unitSuffix})`, '差分'];
  const rows = [
    ...data.map(item => [
      item.assignee,
      item.taskCount,
      convertHours(item.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(item.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(item.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]),
    ['合計', total.taskCount,
      convertHours(total.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(total.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(total.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]
  ];

  await copyToClipboard(headers, rows);
}

/**
 * 担当者別集計表をエクスポート
 * @param data データ
 * @param total 合計
 * @param format フォーマット
 * @param unit 単位
 */
export function exportAssigneeSummary(
  data: AssigneeSummaryData[],
  total: Omit<AssigneeSummaryData, 'assignee'>,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours'
): void {
  const unitSuffix = getUnitSuffix(unit);
  const headers = ['担当者', 'タスク数', `予定工数(${unitSuffix})`, `実績工数(${unitSuffix})`, '差分'];
  const rows = [
    ...data.map(item => [
      item.assignee,
      item.taskCount,
      convertHours(item.plannedHours, unit),
      convertHours(item.actualHours, unit),
      convertHours(item.difference, unit)
    ]),
    ['合計', total.taskCount, convertHours(total.plannedHours, unit), convertHours(total.actualHours, unit), convertHours(total.difference, unit)]
  ];

  exportTableData(headers, rows, {
    filename: `担当者別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}

interface MonthlyAssigneeData {
  months: string[];
  assignees: string[];
  data: Array<{
    month: string;
    assignee: string;
    plannedHours: number;
    actualHours: number;
    difference: number;
  }>;
  monthlyTotals: Record<string, {
    plannedHours: number;
    actualHours: number;
    difference: number;
  }>;
  assigneeTotals: Record<string, {
    plannedHours: number;
    actualHours: number;
    difference: number;
  }>;
  grandTotal: {
    plannedHours: number;
    actualHours: number;
    difference: number;
  };
}

/**
 * 月別担当者別集計表をクリップボードにコピー
 * @param data 
 * @param unit 
 */
export async function copyMonthlyAssigneeSummaryToClipboard(
  data: MonthlyAssigneeData,
  unit: HoursUnit = 'hours'
): Promise<void> {
  const unitSuffix = getUnitSuffix(unit);
  const headers = [
    '担当者',
    ...data.months.flatMap(month => [`${month}_予定(${unitSuffix})`, `${month}_実績(${unitSuffix})`, `${month}_差分`]),
    `合計_予定(${unitSuffix})`,
    `合計_実績(${unitSuffix})`,
    '合計_差分'
  ];

  const rows = [
    ...data.assignees.map(assignee => {
      const row: (string | number)[] = [assignee];

      data.months.forEach(month => {
        const monthData = data.data.find(d => d.month === month && d.assignee === assignee);
        row.push(
          convertHours(monthData?.plannedHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(monthData?.actualHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(monthData?.difference || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        );
      });

      const assigneeTotal = data.assigneeTotals[assignee];
      row.push(
        convertHours(assigneeTotal.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        convertHours(assigneeTotal.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        convertHours(assigneeTotal.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      );

      return row;
    }),
    [
      '合計',
      ...data.months.flatMap(month => {
        const total = data.monthlyTotals[month];
        return [
          convertHours(total.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(total.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(total.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        ];
      }),
      convertHours(data.grandTotal.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(data.grandTotal.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(data.grandTotal.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]
  ];

  await copyToClipboard(headers, rows);
}

/**
 * 月別担当者別集計表をエクスポート
 * @param data データ
 * @param format フォーマット
 * @param unit 単位
 */
export function exportMonthlyAssigneeSummary(
  data: MonthlyAssigneeData,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours'
): void {
  const unitSuffix = getUnitSuffix(unit);
  const headers = [
    '担当者',
    ...data.months.flatMap(month => [`${month}_予定(${unitSuffix})`, `${month}_実績(${unitSuffix})`, `${month}_差分`]),
    `合計_予定(${unitSuffix})`,
    `合計_実績(${unitSuffix})`,
    '合計_差分'
  ];

  const rows = [
    ...data.assignees.map(assignee => {
      const row: (string | number)[] = [assignee];

      data.months.forEach(month => {
        const monthData = data.data.find(d => d.month === month && d.assignee === assignee);
        row.push(
          convertHours(monthData?.plannedHours || 0, unit),
          convertHours(monthData?.actualHours || 0, unit),
          convertHours(monthData?.difference || 0, unit)
        );
      });

      const assigneeTotal = data.assigneeTotals[assignee];
      row.push(
        convertHours(assigneeTotal.plannedHours, unit),
        convertHours(assigneeTotal.actualHours, unit),
        convertHours(assigneeTotal.difference, unit)
      );

      return row;
    }),
    [
      '合計',
      ...data.months.flatMap(month => {
        const total = data.monthlyTotals[month];
        return [
          convertHours(total.plannedHours, unit),
          convertHours(total.actualHours, unit),
          convertHours(total.difference, unit)
        ];
      }),
      convertHours(data.grandTotal.plannedHours, unit),
      convertHours(data.grandTotal.actualHours, unit),
      convertHours(data.grandTotal.difference, unit)
    ]
  ];

  exportTableData(headers, rows, {
    filename: `月別担当者別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}

// 月別・工程別 集計のエクスポート/コピー
interface MonthlyPhaseDataCell {
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

export interface MonthlyPhaseSummaryExportInput {
  months: string[];
  phases: string[];
  // `${month}|${phase}` をキーにしたセル集計
  cells: Map<string, MonthlyPhaseDataCell> | Record<string, MonthlyPhaseDataCell>;
  // 月別合計
  monthlyTotals: Record<string, MonthlyPhaseDataCell>;
  // 工程別合計
  phaseTotals: Record<string, MonthlyPhaseDataCell>;
  // 全体合計
  grandTotal: MonthlyPhaseDataCell;
}

function getCellFromContainer(
  container: Map<string, MonthlyPhaseDataCell> | Record<string, MonthlyPhaseDataCell>,
  key: string
): MonthlyPhaseDataCell | undefined {
  if (container instanceof Map) return container.get(key);
  return (container as Record<string, MonthlyPhaseDataCell>)[key];
}

/**
 * 月別工程別集計表をクリップボードにコピー
 * @param data データ
 * @param unit 単位
 */
export async function copyMonthlyPhaseSummaryToClipboard(
  data: MonthlyPhaseSummaryExportInput,
  unit: HoursUnit = 'hours'
): Promise<void> {
  const unitSuffix = getUnitSuffix(unit);
  const headers = [
    '工程',
    ...data.months.flatMap(month => [`${month}_予定(${unitSuffix})`, `${month}_実績(${unitSuffix})`, `${month}_差分`]),
    `合計_予定(${unitSuffix})`,
    `合計_実績(${unitSuffix})`,
    '合計_差分'
  ];

  const rows = [
    ...data.phases.map(phase => {
      const row: (string | number)[] = [phase];
      data.months.forEach(month => {
        const cell = getCellFromContainer(data.cells, `${month}|${phase}`);
        row.push(
          convertHours(cell?.plannedHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(cell?.actualHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(cell?.difference || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        );
      });
      const total = data.phaseTotals[phase];
      row.push(
        convertHours(total?.plannedHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        convertHours(total?.actualHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        convertHours(total?.difference || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      );
      return row;
    }),
    [
      '合計',
      ...data.months.flatMap(month => {
        const total = data.monthlyTotals[month];
        return [
          convertHours(total?.plannedHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(total?.actualHours || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          convertHours(total?.difference || 0, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        ];
      }),
      convertHours(data.grandTotal.plannedHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(data.grandTotal.actualHours, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      convertHours(data.grandTotal.difference, unit).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    ]
  ];

  await copyToClipboard(headers, rows);
}

/**
 * 月別工程別集計表をエクスポート
 * @param data データ
 * @param format フォーマット
 * @param unit 単位
 */
export function exportMonthlyPhaseSummary(
  data: MonthlyPhaseSummaryExportInput,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours'
): void {
  const unitSuffix = getUnitSuffix(unit);
  const headers = [
    '工程',
    ...data.months.flatMap(month => [`${month}_予定(${unitSuffix})`, `${month}_実績(${unitSuffix})`, `${month}_差分`]),
    `合計_予定(${unitSuffix})`,
    `合計_実績(${unitSuffix})`,
    '合計_差分'
  ];

  const rows = [
    ...data.phases.map(phase => {
      const row: (string | number)[] = [phase];
      data.months.forEach(month => {
        const cell = getCellFromContainer(data.cells, `${month}|${phase}`);
        row.push(
          convertHours(cell?.plannedHours || 0, unit),
          convertHours(cell?.actualHours || 0, unit),
          convertHours(cell?.difference || 0, unit)
        );
      });
      const total = data.phaseTotals[phase];
      row.push(
        convertHours(total?.plannedHours || 0, unit),
        convertHours(total?.actualHours || 0, unit),
        convertHours(total?.difference || 0, unit)
      );
      return row;
    }),
    [
      '合計',
      ...data.months.flatMap(month => {
        const total = data.monthlyTotals[month];
        return [
          convertHours(total?.plannedHours || 0, unit),
          convertHours(total?.actualHours || 0, unit),
          convertHours(total?.difference || 0, unit)
        ];
      }),
      convertHours(data.grandTotal.plannedHours, unit),
      convertHours(data.grandTotal.actualHours, unit),
      convertHours(data.grandTotal.difference, unit)
    ]
  ];

  exportTableData(headers, rows, {
    filename: `月別工程別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}