import type { WbsSyncMode } from './wbs-sync-mode';

/** 定期インポートの実行タイミングを解釈するタイムゾーン */
export const IMPORT_SCHEDULE_TIMEZONE = 'Asia/Tokyo';

/**
 * 画面で選べる定期インポートの実行タイミング。
 * 保存するのは cron 式（分 時 日 月 曜日）なので、選択肢はここに追加・変更するだけで増減できる。
 */
export const IMPORT_SCHEDULE_PRESETS = [
  { label: '毎日（3:00）', cronExpression: '0 3 * * *' },
  { label: '毎日 9時・12時・17時', cronExpression: '0 9,12,17 * * *' },
  { label: '毎時', cronExpression: '0 * * * *' },
] as const;

/** 未設定のWBSの実行タイミング（毎日3:00） */
export const DEFAULT_IMPORT_SCHEDULE_CRON = IMPORT_SCHEDULE_PRESETS[0].cronExpression;

/**
 * WBSごとの定期インポート設定の DTO（日時は ISO 8601 文字列）
 */
export interface WbsImportScheduleDto {
  wbsId: number;
  isEnabled: boolean;
  cronExpression: string;
  timezone: string;
  syncMode: WbsSyncMode;
  /** WBS同期の後に、そのWBSの実績（Geppo）の前月・当月分も取り込む */
  includeActuals: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

/** 定期インポート設定一覧の行（設定のないWBSは既定値で返す） */
export interface WbsImportScheduleListItemDto extends WbsImportScheduleDto {
  wbsName: string;
  projectId: string;
  projectName: string;
}

export interface UpdateWbsImportScheduleInput {
  wbsId: number;
  isEnabled: boolean;
  cronExpression: string;
  syncMode: WbsSyncMode;
  includeActuals: boolean;
}

/** 定期インポート全体の設定 */
export interface ImportScheduleSettingsDto {
  /** false の間は定期インポートを起動しない（予定はスキップされる） */
  isEnabled: boolean;
}

export interface RunDueSchedulesResult {
  /** 全体設定で定期インポートが停止中だったため、ジョブを作成しなかった */
  isSkipped: boolean;
  createdJobIds: string[];
}
