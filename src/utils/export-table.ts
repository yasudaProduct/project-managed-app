import { HoursUnit, convertHours, getUnitSuffix } from './hours-converter';

interface ExportOptions {
  filename: string;
  format: 'csv' | 'tsv';
}

/**
 * 集計表の列表示設定。
 * 表示設定で非表示にした列はコピー・出力の対象外とする。
 * 未指定の項目は表示中として扱う。
 */
export interface SummaryColumnVisibility {
  /** 基準工数（月別集計表のみ） */
  showBaseline?: boolean;
  /** 予定工数 */
  showPlanned?: boolean;
  /** 実績工数 */
  showActual?: boolean;
  /** 見通し工数（月別集計表のみ） */
  showForecast?: boolean;
  /** 差分（工程別・担当者別集計表のみ） */
  showDifference?: boolean;
}

type ResolvedColumnVisibility = Required<SummaryColumnVisibility>;

const DEFAULT_COLUMN_VISIBILITY: ResolvedColumnVisibility = {
  showBaseline: true,
  showPlanned: true,
  showActual: true,
  showForecast: true,
  showDifference: true,
};

function resolveColumnVisibility(
  columns?: SummaryColumnVisibility
): ResolvedColumnVisibility {
  return { ...DEFAULT_COLUMN_VISIBILITY, ...columns };
}

/** コピー・出力時の工数の小数点桁数 */
export const OUTPUT_HOURS_FRACTION_DIGITS = 3;

/**
 * 工数をコピー・出力用にフォーマットする（小数点第3位まで）
 * @param hours 工数（時間）
 * @param unit 単位
 */
export function formatOutputHours(hours: number, unit: HoursUnit): string {
  const formatted = convertHours(hours, unit).toFixed(OUTPUT_HOURS_FRACTION_DIGITS);
  // -0.000 のような表記を避ける
  return Number(formatted) === 0 ? (0).toFixed(OUTPUT_HOURS_FRACTION_DIGITS) : formatted;
}

/**
 * クリップボードにコピー
 * navigator.clipboard.writeText()はHTTPS環境でのみ利用可能なため、
 * HTTP環境でも動作するdocument.execCommand('copy')を使用する。
 * ※ document.execCommand('copy')は非推奨APIだが、HTTP環境での互換性のために使用。
 * @param headers ヘッダー
 * @param rows データ
 */
export function copyToClipboard(
  headers: string[],
  rows: (string | number | undefined | null)[][],
): void {
  const formatCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '';
    return String(cell);
  };

  // ヘッダーとデータを結合
  const headerRow = headers.map(formatCell).join('\t');
  const dataRows = rows.map(row => row.map(formatCell).join('\t'));
  const content = [headerRow, ...dataRows].join('\n');

  // クリップボードにコピー
  // document.execCommand('copy')は非推奨だが、HTTP環境ではnavigator.clipboard APIが利用できないため使用
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

/**
 * テーブルデータをエクスポート
 * @param headers ヘッダー
 * @param rows データ
 * @param options オプション
 */
export function exportTableData(
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
  const bom = '﻿';
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

/** 工程別・担当者別集計表の1行分のデータ */
interface CategorySummaryRow {
  label: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

/**
 * 工程別・担当者別集計表のヘッダーと行を、表示中の列のみで組み立てる
 */
function buildCategorySummaryTable(
  firstColumnHeader: string,
  rows: CategorySummaryRow[],
  unit: HoursUnit,
  columns: ResolvedColumnVisibility
): { headers: string[]; rows: string[][] } {
  const unitSuffix = getUnitSuffix(unit);

  const headers = [firstColumnHeader, 'タスク数'];
  if (columns.showPlanned) headers.push(`予定工数(${unitSuffix})`);
  if (columns.showActual) headers.push(`実績工数(${unitSuffix})`);
  if (columns.showDifference) headers.push('差分');

  const dataRows = rows.map(row => {
    const cells: string[] = [row.label, String(row.taskCount)];
    if (columns.showPlanned) cells.push(formatOutputHours(row.plannedHours, unit));
    if (columns.showActual) cells.push(formatOutputHours(row.actualHours, unit));
    if (columns.showDifference) cells.push(formatOutputHours(row.difference, unit));
    return cells;
  });

  return { headers, rows: dataRows };
}

interface PhaseSummaryData {
  phase: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
}

function toPhaseSummaryRows(
  data: PhaseSummaryData[],
  total: Omit<PhaseSummaryData, 'phase'>
): CategorySummaryRow[] {
  return [
    ...data.map(item => ({ ...item, label: item.phase })),
    { ...total, label: '合計' },
  ];
}

/**
 * 工程別集計表をクリップボードにコピー
 * @param data データ
 * @param total 合計
 * @param unit 単位
 * @param columns 表示中の列
 */
export async function copyPhaseSummaryToClipboard(
  data: PhaseSummaryData[],
  total: Omit<PhaseSummaryData, 'phase'>,
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): Promise<void> {
  const table = buildCategorySummaryTable(
    '工程',
    toPhaseSummaryRows(data, total),
    unit,
    resolveColumnVisibility(columns)
  );

  // クリップボードにコピー
  await copyToClipboard(table.headers, table.rows);
}

/**
 * 工程別集計表をエクスポート
 * @param data データ
 * @param total 合計
 * @param format フォーマット
 * @param unit 単位
 * @param columns 表示中の列
 */
export function exportPhaseSummary(
  data: PhaseSummaryData[],
  total: Omit<PhaseSummaryData, 'phase'>,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): void {
  const table = buildCategorySummaryTable(
    '工程',
    toPhaseSummaryRows(data, total),
    unit,
    resolveColumnVisibility(columns)
  );

  exportTableData(table.headers, table.rows, {
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

function toAssigneeSummaryRows(
  data: AssigneeSummaryData[],
  total: Omit<AssigneeSummaryData, 'assignee'>
): CategorySummaryRow[] {
  return [
    ...data.map(item => ({ ...item, label: item.assignee })),
    { ...total, label: '合計' },
  ];
}

/**
 * 担当者別集計表をクリップボードにコピー
 * @param data データ
 * @param total 合計
 * @param unit 単位
 * @param columns 表示中の列
 */
export async function copyAssigneeSummaryToClipboard(
  data: AssigneeSummaryData[],
  total: Omit<AssigneeSummaryData, 'assignee'>,
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): Promise<void> {
  const table = buildCategorySummaryTable(
    '担当者',
    toAssigneeSummaryRows(data, total),
    unit,
    resolveColumnVisibility(columns)
  );

  await copyToClipboard(table.headers, table.rows);
}

/**
 * 担当者別集計表をエクスポート
 * @param data データ
 * @param total 合計
 * @param format フォーマット
 * @param unit 単位
 * @param columns 表示中の列
 */
export function exportAssigneeSummary(
  data: AssigneeSummaryData[],
  total: Omit<AssigneeSummaryData, 'assignee'>,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): void {
  const table = buildCategorySummaryTable(
    '担当者',
    toAssigneeSummaryRows(data, total),
    unit,
    resolveColumnVisibility(columns)
  );

  exportTableData(table.headers, table.rows, {
    filename: `担当者別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}

/** 月別集計表の工数セル */
interface MonthlyHoursCell {
  plannedHours?: number;
  actualHours?: number;
  baselineHours?: number;
  forecastHours?: number;
}

/** 月別集計表の工数列（表示中のもののみ） */
function buildMonthlyHoursColumns(
  unit: HoursUnit,
  columns: ResolvedColumnVisibility
): { label: string; pick: (cell?: MonthlyHoursCell) => number }[] {
  const unitSuffix = getUnitSuffix(unit);
  const hoursColumns: { label: string; pick: (cell?: MonthlyHoursCell) => number }[] = [];

  if (columns.showBaseline) {
    hoursColumns.push({ label: `基準(${unitSuffix})`, pick: cell => cell?.baselineHours || 0 });
  }
  if (columns.showPlanned) {
    hoursColumns.push({ label: `予定(${unitSuffix})`, pick: cell => cell?.plannedHours || 0 });
  }
  if (columns.showActual) {
    hoursColumns.push({ label: `実績(${unitSuffix})`, pick: cell => cell?.actualHours || 0 });
  }
  if (columns.showForecast) {
    hoursColumns.push({ label: `見通し(${unitSuffix})`, pick: cell => cell?.forecastHours || 0 });
  }

  return hoursColumns;
}

/**
 * 月別集計表のヘッダーと行を、表示中の列のみで組み立てる
 */
function buildMonthlyTable(
  firstColumnHeader: string,
  months: string[],
  rowItems: {
    label: string;
    getCell: (month: string) => MonthlyHoursCell | undefined;
    total: MonthlyHoursCell | undefined;
  }[],
  getMonthlyTotal: (month: string) => MonthlyHoursCell | undefined,
  grandTotal: MonthlyHoursCell,
  unit: HoursUnit,
  columns: ResolvedColumnVisibility
): { headers: string[]; rows: string[][] } {
  const hoursColumns = buildMonthlyHoursColumns(unit, columns);

  const headers = [
    firstColumnHeader,
    ...months.flatMap(month => hoursColumns.map(c => `${month}_${c.label}`)),
    ...hoursColumns.map(c => `合計_${c.label}`),
  ];

  const toCells = (cell: MonthlyHoursCell | undefined) =>
    hoursColumns.map(c => formatOutputHours(c.pick(cell), unit));

  const rows = [
    ...rowItems.map(item => [
      item.label,
      ...months.flatMap(month => toCells(item.getCell(month))),
      ...toCells(item.total),
    ]),
    [
      '合計',
      ...months.flatMap(month => toCells(getMonthlyTotal(month))),
      ...toCells(grandTotal),
    ],
  ];

  return { headers, rows };
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
    baselineHours?: number;
    forecastHours?: number;
  }>;
  monthlyTotals: Record<string, {
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  }>;
  assigneeTotals: Record<string, {
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  }>;
  grandTotal: {
    plannedHours: number;
    actualHours: number;
    difference: number;
    baselineHours?: number;
    forecastHours?: number;
  };
}

function buildMonthlyAssigneeTable(
  data: MonthlyAssigneeData,
  unit: HoursUnit,
  columns: SummaryColumnVisibility | undefined
): { headers: string[]; rows: string[][] } {
  return buildMonthlyTable(
    '担当者',
    data.months,
    data.assignees.map(assignee => ({
      label: assignee,
      getCell: (month: string) =>
        data.data.find(d => d.month === month && d.assignee === assignee),
      total: data.assigneeTotals[assignee],
    })),
    (month: string) => data.monthlyTotals[month],
    data.grandTotal,
    unit,
    resolveColumnVisibility(columns)
  );
}

/**
 * 月別担当者別集計表をクリップボードにコピー
 * @param data データ
 * @param unit 単位
 * @param columns 表示中の列
 */
export async function copyMonthlyAssigneeSummaryToClipboard(
  data: MonthlyAssigneeData,
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): Promise<void> {
  const table = buildMonthlyAssigneeTable(data, unit, columns);

  await copyToClipboard(table.headers, table.rows);
}

/**
 * 月別担当者別集計表をエクスポート
 * @param data データ
 * @param format フォーマット
 * @param unit 単位
 * @param columns 表示中の列
 */
export function exportMonthlyAssigneeSummary(
  data: MonthlyAssigneeData,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): void {
  const table = buildMonthlyAssigneeTable(data, unit, columns);

  exportTableData(table.headers, table.rows, {
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
  baselineHours?: number;
  forecastHours?: number;
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

function buildMonthlyPhaseTable(
  data: MonthlyPhaseSummaryExportInput,
  unit: HoursUnit,
  columns: SummaryColumnVisibility | undefined
): { headers: string[]; rows: string[][] } {
  return buildMonthlyTable(
    '工程',
    data.months,
    data.phases.map(phase => ({
      label: phase,
      getCell: (month: string) => getCellFromContainer(data.cells, `${month}|${phase}`),
      total: data.phaseTotals[phase],
    })),
    (month: string) => data.monthlyTotals[month],
    data.grandTotal,
    unit,
    resolveColumnVisibility(columns)
  );
}

/**
 * 月別工程別集計表をクリップボードにコピー
 * @param data データ
 * @param unit 単位
 * @param columns 表示中の列
 */
export async function copyMonthlyPhaseSummaryToClipboard(
  data: MonthlyPhaseSummaryExportInput,
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): Promise<void> {
  const table = buildMonthlyPhaseTable(data, unit, columns);

  await copyToClipboard(table.headers, table.rows);
}

/**
 * 月別工程別集計表をエクスポート
 * @param data データ
 * @param format フォーマット
 * @param unit 単位
 * @param columns 表示中の列
 */
export function exportMonthlyPhaseSummary(
  data: MonthlyPhaseSummaryExportInput,
  format: 'csv' | 'tsv',
  unit: HoursUnit = 'hours',
  columns?: SummaryColumnVisibility
): void {
  const table = buildMonthlyPhaseTable(data, unit, columns);

  exportTableData(table.headers, table.rows, {
    filename: `月別工程別集計表_${new Date().toISOString().slice(0, 10)}`,
    format
  });
}
