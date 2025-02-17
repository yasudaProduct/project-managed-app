import { ProjectStatus, TaskStatus } from "@/types/wbs";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDateyyyymmdd = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
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
