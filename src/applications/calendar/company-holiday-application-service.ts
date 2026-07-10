import { inject, injectable } from "inversify";
import { SYMBOL } from "@/types/symbol";
import type { ICompanyHolidayRepository } from "./icompany-holiday-repository";
import type { CompanyHoliday } from "@/domains/calendar/company-calendar";
import type { CompanyHolidayDto, CompanyHolidayType } from "@/types/company-holiday";

export interface CompanyHolidayInput {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  type: CompanyHolidayType;
}

export type CompanyHolidayMutationResult =
  | { success: true; holiday: CompanyHolidayDto }
  | { success: false; error: string };

export interface ICompanyHolidayApplicationService {
  getHolidays(): Promise<CompanyHolidayDto[]>;
  createHoliday(input: CompanyHolidayInput): Promise<CompanyHolidayMutationResult>;
  updateHoliday(id: number, input: CompanyHolidayInput): Promise<CompanyHolidayMutationResult>;
  deleteHoliday(id: number): Promise<{ success: boolean; error?: string }>;
}

function toDto(holiday: CompanyHoliday): CompanyHolidayDto {
  return {
    id: holiday.id!,
    date: holiday.date.toISOString().split("T")[0],
    name: holiday.name,
    type: holiday.type as CompanyHolidayType,
    createdAt: holiday.createdAt?.toISOString() ?? "",
    updatedAt: holiday.updatedAt?.toISOString() ?? "",
  };
}

@injectable()
export class CompanyHolidayApplicationService
  implements ICompanyHolidayApplicationService
{
  constructor(
    @inject(SYMBOL.ICompanyHolidayRepository)
    private readonly repository: ICompanyHolidayRepository
  ) {}

  async getHolidays(): Promise<CompanyHolidayDto[]> {
    const holidays = await this.repository.findAll();
    return holidays.map(toDto);
  }

  async createHoliday(
    input: CompanyHolidayInput
  ): Promise<CompanyHolidayMutationResult> {
    const existing = await this.repository.findByDate(new Date(input.date));
    if (existing) {
      return {
        success: false,
        error: "指定された日付には既に休日が登録されています",
      };
    }

    const saved = await this.repository.save({
      date: new Date(input.date),
      name: input.name,
      type: input.type,
    });
    return { success: true, holiday: toDto(saved) };
  }

  async updateHoliday(
    id: number,
    input: CompanyHolidayInput
  ): Promise<CompanyHolidayMutationResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, error: "指定された休日が見つかりません" };
    }

    const conflict = await this.repository.findByDateExcludingId(
      new Date(input.date),
      id
    );
    if (conflict) {
      return {
        success: false,
        error: "指定された日付には既に他の休日が登録されています",
      };
    }

    const updated = await this.repository.update(id, {
      date: new Date(input.date),
      name: input.name,
      type: input.type,
    });
    return { success: true, holiday: toDto(updated) };
  }

  async deleteHoliday(id: number): Promise<{ success: boolean; error?: string }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, error: "指定された休日が見つかりません" };
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
