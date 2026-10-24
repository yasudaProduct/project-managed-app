import { IMPORT_SCHEDULE_PRESETS } from "@/types/import-schedule";
import type { WbsSyncMode } from "@/types/wbs-sync-mode";

/** 実行タイミング（cron 式）の表示名。画面の選択肢にないものはカスタムとして cron 式を表示する */
export function getImportScheduleLabel(cronExpression: string): string {
  const preset = IMPORT_SCHEDULE_PRESETS.find((p) => p.cronExpression === cronExpression);
  return preset ? preset.label : `カスタム（${cronExpression}）`;
}

export const WBS_SYNC_MODE_LABELS: Record<WbsSyncMode, string> = {
  diff: "差分",
  replace: "洗い替え",
};
