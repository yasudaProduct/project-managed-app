export type CompanyHolidayType = "NATIONAL" | "COMPANY" | "SPECIAL";

/**
 * 会社休日の UI/Server Action 受け渡し用 DTO。
 * date は "YYYY-MM-DD"、createdAt/updatedAt は ISO 文字列。
 */
export interface CompanyHolidayDto {
  id: number;
  date: string;
  name: string;
  type: CompanyHolidayType;
  createdAt: string;
  updatedAt: string;
}
