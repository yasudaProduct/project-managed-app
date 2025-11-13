import { SystemSettings } from '@/domains/system-settings/system-settings';

/**
 * システム設定リポジトリのインターフェース
 */
export interface ISystemSettingsRepository {
  /**
   * システム設定を取得する
   */
  get(): Promise<SystemSettings>;

  /**
   * システム設定を更新する
   * @param settings システム設定
   */
  update(settings: SystemSettings): Promise<void>;
}
