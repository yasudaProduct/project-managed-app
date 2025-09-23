import { ProjectStatus, TaskStatus } from "@/types/wbs";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// ランダムな文字列を生成 A-Z, a-z
export const randomString = (length: number = 10): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}