import type { SchedulingSettings } from "@/types/scheduling-settings";

/**
 * プロジェクト単位のスケジュール計算設定を読み取るリポジトリ。
 * project_settings.schedulingSettings(Json) を SchedulingSettings に正規化して返す。
 */
export interface ISchedulingSettingsRepository {
  getByProjectId(projectId: string): Promise<SchedulingSettings>;
}
