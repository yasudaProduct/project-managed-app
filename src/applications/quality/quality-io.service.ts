import { QualitySizeUnit, FindingSource } from '@/domains/quality/value-objects/quality-enums';

// === Finding CSV ===

export interface FindingCsvRow {
  taskNo: string;
  source?: string;
  category?: string;
  injectionPhase?: string;
  phenomenonType?: string;
  causeType?: string;
  description?: string;
  foundAt: string;
}

export interface ParsedFinding {
  taskNo: string;
  source: FindingSource;
  category?: string;
  injectionPhase?: string;
  phenomenonType?: string;
  causeType?: string;
  description?: string;
  foundAt: Date;
}

// === Size CSV ===

export interface SizeCsvRow {
  taskNo: string;
  unit: string;
  value: string | number;
  measuredAt: string;
  note?: string;
}

export interface ParsedSize {
  taskNo: string;
  unit: QualitySizeUnit;
  value: number;
  measuredAt: Date;
  note?: string;
}

// === Test Progress CSV ===

export interface TestProgressCsvRow {
  taskNo: string;
  date: string;
  plannedTotal: string | number;
  executedTotal: string | number;
  passedTotal: string | number;
  failedTotal: string | number;
  blockedTotal: string | number;
}

export interface ParsedTestProgress {
  taskNo: string;
  date: Date;
  plannedTotal: number;
  executedTotal: number;
  passedTotal: number;
  failedTotal: number;
  blockedTotal: number;
}

// === Target Attribute CSV ===

export interface TargetAttributeCsvRow {
  taskNo: string;
  subsystem?: string;
  featureGroup?: string;
}

export interface ParsedTargetAttribute {
  taskNo: string;
  subsystem?: string;
  featureGroup?: string;
}

// === Common ===

export interface ParseResult<T> {
  rows: T[];
  errors: { line: number; message: string }[];
}

function normalizeSource(raw: string | undefined): FindingSource {
  if (!raw) return FindingSource.REVIEW;
  const v = raw.trim().toUpperCase();
  if (v === 'TEST' || v === 'テスト') return FindingSource.TEST;
  if (v === 'REVIEW' || v === 'レビュー') return FindingSource.REVIEW;
  return FindingSource.REVIEW;
}

function normalizeUnit(raw: string): QualitySizeUnit | null {
  const v = raw.trim().toUpperCase();
  if (v === 'PAGE' || v === 'ページ') return QualitySizeUnit.PAGE;
  if (v === 'LOC' || v === 'ステップ') return QualitySizeUnit.LOC;
  if (v === 'FP') return QualitySizeUnit.FP;
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

function parseNonNegativeInt(raw: string | number, fieldName: string): { value?: number; error?: string } {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: `${fieldName}は整数で指定してください: ${raw}` };
  }
  if (n < 0) {
    return { error: `${fieldName}は0以上で指定してください: ${raw}` };
  }
  return { value: n };
}

// === Parsers ===

export function parseFindingRows(rows: FindingCsvRow[]): ParseResult<ParsedFinding> {
  const result: ParseResult<ParsedFinding> = { rows: [], errors: [] };
  rows.forEach((row, i) => {
    const line = i + 2;
    const taskNo = row.taskNo?.trim();
    if (!taskNo) {
      result.errors.push({ line, message: 'taskNoが必須です' });
      return;
    }
    const foundAt = parseDate(row.foundAt ?? '');
    if (!foundAt) {
      result.errors.push({ line, message: `foundAtが不正: ${row.foundAt}` });
      return;
    }
    const source = normalizeSource(row.source);
    result.rows.push({
      taskNo,
      source,
      category: row.category?.trim() || undefined,
      injectionPhase: row.injectionPhase?.trim() || undefined,
      phenomenonType: row.phenomenonType?.trim() || undefined,
      causeType: row.causeType?.trim() || undefined,
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

export function parseTestProgressRows(rows: TestProgressCsvRow[]): ParseResult<ParsedTestProgress> {
  const result: ParseResult<ParsedTestProgress> = { rows: [], errors: [] };
  rows.forEach((row, i) => {
    const line = i + 2;
    const taskNo = row.taskNo?.trim();
    if (!taskNo) {
      result.errors.push({ line, message: 'taskNoが必須です' });
      return;
    }
    const date = parseDate(row.date ?? '');
    if (!date) {
      result.errors.push({ line, message: `dateが不正: ${row.date}` });
      return;
    }

    const fields = ['plannedTotal', 'executedTotal', 'passedTotal', 'failedTotal', 'blockedTotal'] as const;
    const parsed: Record<string, number> = {};
    for (const field of fields) {
      const r = parseNonNegativeInt(row[field], field);
      if (r.error) {
        result.errors.push({ line, message: r.error });
        return;
      }
      parsed[field] = r.value!;
    }

    result.rows.push({
      taskNo,
      date,
      plannedTotal: parsed.plannedTotal,
      executedTotal: parsed.executedTotal,
      passedTotal: parsed.passedTotal,
      failedTotal: parsed.failedTotal,
      blockedTotal: parsed.blockedTotal,
    });
  });
  return result;
}

export function parseTargetAttributeRows(rows: TargetAttributeCsvRow[]): ParseResult<ParsedTargetAttribute> {
  const result: ParseResult<ParsedTargetAttribute> = { rows: [], errors: [] };
  rows.forEach((row, i) => {
    const line = i + 2;
    const taskNo = row.taskNo?.trim();
    if (!taskNo) {
      result.errors.push({ line, message: 'taskNoが必須です' });
      return;
    }
    result.rows.push({
      taskNo,
      subsystem: row.subsystem?.trim() || undefined,
      featureGroup: row.featureGroup?.trim() || undefined,
    });
  });
  return result;
}

// === TSV Export ===

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
