/**
 * Outlook 予定表エクスポート（CSV）の列名
 * @description 日本語版・英語版の Outlook で列名が異なるため、別名をまとめて定義する。
 * 照合は前後空白・大文字小文字を無視して行う。
 */
export const OUTLOOK_CALENDAR_CSV_COLUMNS = {
  subject: ['件名', 'Subject'],
  startDate: ['開始日', 'Start Date'],
  startTime: ['開始時刻', 'Start Time'],
  endDate: ['終了日', 'End Date'],
  endTime: ['終了時刻', 'End Time'],
  allDay: ['終日イベント', 'All day event'],
  location: ['場所', 'Location'],
  description: ['内容', '説明', 'Description'],
  showTimeAs: ['公開する時間帯の種類', '公開方法', 'Show time as'],
} as const satisfies Record<string, readonly string[]>;

export type OutlookCalendarCsvColumn = keyof typeof OUTLOOK_CALENDAR_CSV_COLUMNS;

/** 取り込みに必須の列 */
export const REQUIRED_OUTLOOK_CALENDAR_CSV_COLUMNS = ['subject', 'startDate'] as const satisfies readonly OutlookCalendarCsvColumn[];

/**
 * Outlook 予定表CSVの1行（列名を正規化したもの）
 * @description 値はCSVに書かれた文字列のまま。解釈はサーバー側で行う。
 */
export type OutlookCalendarRowDto = {
  /** CSV上の行番号（ヘッダー行を1行目とする） */
  rowNumber: number;
  subject: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  allDay?: string;
  location?: string;
  description?: string;
  showTimeAs?: string;
};

export type OutlookCalendarRowErrorDto = Readonly<{
  rowNumber: number;
  message: string;
}>;

export type ImportOutlookScheduleInput = {
  /** 取り込み先ユーザーID */
  userId: string;
  rows: OutlookCalendarRowDto[];
};

export type OutlookScheduleImportSummaryDto = Readonly<{
  /** 取り込んだ予定の件数 */
  importedEventCount: number;
  /** 作成したスケジュールの件数（終日・日をまたぐ予定は日ごとに分割） */
  createdScheduleCount: number;
  /** 空き時間・他の場所で作業中のためスキップした予定の件数 */
  skippedEventCount: number;
  /** 置き換えた期間（YYYY-MM-DD、両端含む） */
  periodStart: string;
  periodEnd: string;
  /** 解釈できずスキップした行 */
  errors: ReadonlyArray<OutlookCalendarRowErrorDto>;
}>;
