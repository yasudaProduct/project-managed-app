import { SystemSettings } from '@/domains/system-settings/system-settings';

/**
 * テスト用のデフォルト基本稼働時間を取得
 */
export function getDefaultStandardWorkingHours(): number {
  return 7.5;
}

/**
 * テスト用のデフォルトSystemSettingsを作成
 */
export function createDefaultSystemSettings(): SystemSettings {
  return SystemSettings.createDefault();
}

/**
 * テスト用のSystemSettingsを作成
 */
export function createTestSystemSettings(
  standardWorkingHours = 7.5,
  defaultUserCostPerHour: number | null = null
): SystemSettings {
  return SystemSettings.create(standardWorkingHours, defaultUserCostPerHour);
}
