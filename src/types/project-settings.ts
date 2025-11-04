export type ScheduleMatchType = 'EXACT' | 'CONTAINS' | 'REGEX';

export interface AssigneeGanttCalculationOptions {
  standardWorkingHours: number;
  considerPersonalSchedule: boolean;
  scheduleIncludePatterns: string[];
  scheduleExcludePatterns: string[];
  scheduleMatchType: ScheduleMatchType;
}

export interface ProjectSettings {
  projectId: string;
  roundToQuarter: boolean;

  // assignee-gantt計算ロジックオプション
  standardWorkingHours: number;
  considerPersonalSchedule: boolean;
  scheduleIncludePatterns: string[];
  scheduleExcludePatterns: string[];
  scheduleMatchType: ScheduleMatchType;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettingsUpdateInput {
  roundToQuarter?: boolean;
  standardWorkingHours?: number;
  considerPersonalSchedule?: boolean;
  scheduleIncludePatterns?: string[];
  scheduleExcludePatterns?: string[];
  scheduleMatchType?: ScheduleMatchType;
}