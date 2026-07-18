// 日付を <input type="date"> 用の YYYY-MM-DD へ（保存はUTC前提）
export function toDateInputValue(date?: Date): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

// <input type="date"> の値（YYYY-MM-DD）を UTC 0時の Date へ
export function fromDateInputValue(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
