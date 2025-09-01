export class ProjectSettings {
  constructor(
    private readonly id: string,
    private readonly projectId: string,
    private readonly dailyWorkingHours: number | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  static create(projectId: string, dailyWorkingHours?: number): ProjectSettings {
    const now = new Date();
    return new ProjectSettings(
      crypto.randomUUID(),
      projectId,
      dailyWorkingHours ?? null,
      now,
      now
    );
  }

  static fromPrisma(data: {
    id: string;
    projectId: string;
    dailyWorkingHours: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectSettings {
    return new ProjectSettings(
      data.id,
      data.projectId,
      data.dailyWorkingHours,
      data.createdAt,
      data.updatedAt
    );
  }

  getId(): string {
    return this.id;
  }

  getProjectId(): string {
    return this.projectId;
  }

  getDailyWorkingHours(): number | null {
    return this.dailyWorkingHours;
  }

  hasDailyWorkingHours(): boolean {
    return this.dailyWorkingHours !== null;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDailyWorkingHours(hours: number | null): ProjectSettings {
    if (hours !== null && (hours <= 0 || hours > 24)) {
      throw new Error('勤務時間は0より大きく24以下である必要があります');
    }
    return new ProjectSettings(
      this.id,
      this.projectId,
      hours,
      this.createdAt,
      new Date()
    );
  }

  clearDailyWorkingHours(): ProjectSettings {
    return this.updateDailyWorkingHours(null);
  }
}