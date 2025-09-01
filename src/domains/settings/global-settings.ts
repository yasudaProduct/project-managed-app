export class GlobalSettings {
  constructor(
    private readonly id: number,
    private readonly dailyWorkingHours: number,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  static create(dailyWorkingHours: number): GlobalSettings {
    const now = new Date();
    return new GlobalSettings(
      1, // GlobalSettingsは単一レコード
      dailyWorkingHours,
      now,
      now
    );
  }

  static fromPrisma(data: {
    id: number;
    dailyWorkingHours: number;
    createdAt: Date;
    updatedAt: Date;
  }): GlobalSettings {
    return new GlobalSettings(
      data.id,
      data.dailyWorkingHours,
      data.createdAt,
      data.updatedAt
    );
  }

  getId(): number {
    return this.id;
  }

  getDailyWorkingHours(): number {
    return this.dailyWorkingHours;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDailyWorkingHours(hours: number): GlobalSettings {
    if (hours <= 0 || hours > 24) {
      throw new Error('勤務時間は0より大きく24以下である必要があります');
    }
    return new GlobalSettings(
      this.id,
      hours,
      this.createdAt,
      new Date()
    );
  }
}