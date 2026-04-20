import { QualitySeverity, QualitySizeUnit } from '@/domains/quality/value-objects/quality-enums';

export interface FindingCsvRow {
  taskNo: string;
  severity: string;
  category?: string;
  description?: string;
  foundAt: string;
}

export interface SizeCsvRow {
  taskNo: string;
  unit: string;
  value: string | number;
  measuredAt: string;
  note?: string;
}

export interface ParsedFinding {
  taskNo: string;
  severity: QualitySeverity;
  category?: string;
  description?: string;
  foundAt: Date;
}

export interface ParsedSize {
  taskNo: string;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: Date;
  note?: string;
}

export interface ParseResult<T> {
  rows: T[];
  errors: { line: number; message: string }[];
}

function normalizeSeverity(raw: string): QualitySeverity | null {
  const v = raw.trim().toUpperCase();
  if (v === 'MAJOR' || v === '重大') return QualitySeverity.MAJOR;
  if (v === 'MINOR' || v === '軽微') return QualitySeverity.MINOR;
  if (v === 'INFO' || v === '情報') return QualitySeverity.INFO;
  return null;
}

function normalizeUnit(raw: string): QualitySizeUnit | null {
  const v = raw.trim().toUpperCase();
  if (v === 'PAGE' || v === 'ページ') return QualitySizeUnit.PAGE;
  if (v === 'LINES_OF_CODE' || v === 'LOC' || v === 'ステップ') return QualitySizeUnit.LINES_OF_CODE;
  if (v === 'TEST_CASE' || v === 'テストケース') return QualitySizeUnit.TEST_CASE;
  return null;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function parseFindingRows(rows: FindingCsvRow[]): ParseResult<ParsedFinding> {
  const result: ParseResult<ParsedFinding> = { rows: [], errors: [] };
  rows.forEach((row, i) => {
    const line = i + 2;
    const taskNo = row.taskNo?.trim();
    if (!taskNo) {
      result.errors.push({ line, message: 'taskNoが必須です' });
      return;
    }
    const severity = normalizeSeverity(row.severity ?? '');
    if (!severity) {
      result.errors.push({ line, message: `severityが不正: ${row.severity}` });
      return;
    }
    const foundAt = parseDate(row.foundAt ?? '');
    if (!foundAt) {
      result.errors.push({ line, message: `foundAtが不正: ${row.foundAt}` });
      return;
    }
    result.rows.push({
      taskNo,
      severity,
      category: row.category?.trim() || undefined,
      description: row.description?.trim() || undefined,
      foundAt,
    });
  });
  return result;
}

export function parseSizeRows(rows: SizeCsvRow[]): ParseResult<ParsedSize> {
  const result: ParseResult<ParsedSize> = { rows: [], errors: [] };
  rows.forEach((row, i) => {
    const line = i + 2;
    const taskNo = row.taskNo?.trim();
    if (!taskNo) {
      result.errors.push({ line, message: 'taskNoが必須です' });
      return;
    }
    const unit = normalizeUnit(row.unit ?? '');
    if (!unit) {
      result.errors.push({ line, message: `unitが不正: ${row.unit}` });
      return;
    }
    const value = Number(row.value);
    if (!Number.isFinite(value) || value <= 0) {
      result.errors.push({ line, message: `valueは正の数で指定してください: ${row.value}` });
      return;
    }
    const measuredAt = parseDate(row.measuredAt ?? '');
    if (!measuredAt) {
      result.errors.push({ line, message: `measuredAtが不正: ${row.measuredAt}` });
      return;
    }
    result.rows.push({
      taskNo,
      unit,
      value,
      measuredAt,
      note: row.note?.trim() || undefined,
    });
  });
  return result;
}

export function escapeTsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[\t\r\n]/.test(s)) {
    return s.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  }
  return s;
}

export function toTsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(escapeTsv).join('\t')).join('\n');
}
