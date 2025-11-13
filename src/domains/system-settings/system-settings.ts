/**
 * システム全体設定
 */
export class SystemSettings {
  private constructor(
    public readonly standardWorkingHours: number,
    public readonly defaultUserCostPerHour: number | null
  ) {
    if (standardWorkingHours <= 0) {
      throw new Error('standardWorkingHours must be positive');
    }
    if (defaultUserCostPerHour !== null && defaultUserCostPerHour < 0) {
      throw new Error('defaultUserCostPerHour must be non-negative');
    }
  }

  /**
   * システム設定を作成する
   * @param standardWorkingHours 1日の基本稼働時間
   * @param defaultUserCostPerHour デフォルト人員原価（時間単位）
   */
  static create(
    standardWorkingHours: number,
    defaultUserCostPerHour: number | null = null
  ): SystemSettings {
    return new SystemSettings(standardWorkingHours, defaultUserCostPerHour);
  }

  /**
   * デフォルト値でシステム設定を作成する
   */
  static createDefault(): SystemSettings {
    return new SystemSettings(7.5, null);
  }
}
