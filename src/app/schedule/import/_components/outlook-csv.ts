import { parse } from "csv-parse/sync";
import {
  OUTLOOK_CALENDAR_CSV_COLUMNS,
  REQUIRED_OUTLOOK_CALENDAR_CSV_COLUMNS,
  type OutlookCalendarCsvColumn,
  type OutlookCalendarRowDto,
} from "@/types/outlook-calendar";

export type ParseOutlookCalendarCsvResult =
  | { success: true; rows: OutlookCalendarRowDto[] }
  | { success: false; error: string };

const normalizeHeader = (header: string): string =>
  header.replace(/^﻿/, "").trim().replace(/\s+/g, " ").toLowerCase();

/** 正規化した列名 → 列 */
const COLUMN_BY_HEADER: ReadonlyMap<string, OutlookCalendarCsvColumn> = new Map(
  (Object.entries(OUTLOOK_CALENDAR_CSV_COLUMNS) as [OutlookCalendarCsvColumn, readonly string[]][]).flatMap(
    ([column, aliases]) => aliases.map((alias) => [normalizeHeader(alias), column] as const)
  )
);

/**
 * Outlook 予定表エクスポート（CSV）のテキストを、列名を正規化した行へ変換する
 * @description 取り込みに使わない列（出席者・アラーム等）は除き、Server Action へ送るデータ量を抑える。
 * 行番号はヘッダーを1行目とした CSV のレコード番号（Excel で開いたときの行番号）。
 */
export function parseOutlookCalendarCsv(text: string): ParseOutlookCalendarCsvResult {
  let records: string[][];
  try {
    records = parse(text, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });
  } catch {
    return {
      success: false,
      error: "CSVファイルを読み込めませんでした。Outlookからエクスポートしたファイルか確認してください。",
    };
  }

  const [headerRecord, ...dataRecords] = records;
  if (!headerRecord) {
    return { success: false, error: "取り込む予定がありません。" };
  }

  // 同じ列に複数の別名が並ぶ場合は先に現れた列を使う
  const columnIndexes = new Map<OutlookCalendarCsvColumn, number>();
  headerRecord.forEach((header, index) => {
    const column = COLUMN_BY_HEADER.get(normalizeHeader(header));
    if (column && !columnIndexes.has(column)) {
      columnIndexes.set(column, index);
    }
  });

  const missingColumns = REQUIRED_OUTLOOK_CALENDAR_CSV_COLUMNS.filter((column) => !columnIndexes.has(column));
  if (missingColumns.length > 0) {
    const names = missingColumns.map((column) => OUTLOOK_CALENDAR_CSV_COLUMNS[column][0]).join("、");
    return {
      success: false,
      error: `Outlookの予定表エクスポート（CSV）の形式ではありません。必要な列（${names}）が見つかりません。`,
    };
  }

  const rows: OutlookCalendarRowDto[] = [];
  dataRecords.forEach((record, index) => {
    if (record.every((cell) => cell.trim() === "")) {
      return;
    }

    const cellOf = (column: OutlookCalendarCsvColumn): string | undefined => {
      const columnIndex = columnIndexes.get(column);
      return columnIndex === undefined ? undefined : (record[columnIndex] ?? "");
    };

    const row: OutlookCalendarRowDto = {
      rowNumber: index + 2,
      subject: cellOf("subject") ?? "",
      startDate: cellOf("startDate") ?? "",
    };
    for (const column of OPTIONAL_COLUMNS) {
      const cell = cellOf(column);
      if (cell !== undefined) {
        row[column] = cell;
      }
    }
    rows.push(row);
  });

  if (rows.length === 0) {
    return { success: false, error: "取り込む予定がありません。" };
  }
  return { success: true, rows };
}

const OPTIONAL_COLUMNS = [
  "startTime",
  "endDate",
  "endTime",
  "allDay",
  "location",
  "description",
  "showTimeAs",
] as const satisfies readonly Exclude<OutlookCalendarCsvColumn, "subject" | "startDate">[];
