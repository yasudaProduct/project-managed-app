/**
 * 定期インポート全体の設定
 */
export class ImportScheduleSettings {
  private constructor(
    /** false の間は定期インポートを起動しない（予定はスキップされる） */
    public readonly isEnabled: boolean
  ) { }

  static create(isEnabled: boolean): ImportScheduleSettings {
    return new ImportScheduleSettings(isEnabled);
  }

  /** 既定値（有効） */
  static createDefault(): ImportScheduleSettings {
    return new ImportScheduleSettings(true);
  }
}
