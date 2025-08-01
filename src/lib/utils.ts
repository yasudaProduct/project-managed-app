import { ProjectStatus, TaskStatus } from "@/types/wbs";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as holiday_jp from '@holiday-jp/holiday_jp';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @deprecated Use formatUTCDateForDisplaySlash from date-display-utils.ts instead
 * この関数はローカルタイムゾーンを使用するため、日付のズレが発生する可能性があります
 */
export const formatDateyyyymmdd = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  if (isNaN(Date.parse(dateString))) return undefined;

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2);
  const day = (`0${date.getDate()}`).slice(-2);
  return `${year}/${month}/${day}`;
};

export const getProjectStatusName = (status: ProjectStatus) => {
  switch (status) {
    case "INACTIVE":
      return "未開始";
    case "ACTIVE":
      return "進行中";
    case "DONE":
      return "完了";
    case "CANCELLED":
      return "中止";
    case "PENDING":
      return "保留";
    default:
      return "不明";
  }
};

export const getTaskStatusName = (status: TaskStatus) => {
  switch (status) {
    case "NOT_STARTED":
      return "未開始";
    case "IN_PROGRESS":
      return "進行中";
    case "COMPLETED":
      return "完了";
  }
};

interface Holiday {
  date: Date;
  name: string;
}

// 祝日リストを取得
export const getHolidays = (year: number): Holiday[] => {
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 0, 1)

  return holiday_jp.between(startDate, endDate)
}

// 土日・祝日かどうかを判定
export const isHoliday = (date: Date): boolean => {
  return holiday_jp.isHoliday(date) || date.getDay() === 0 || date.getDay() === 6;
}
