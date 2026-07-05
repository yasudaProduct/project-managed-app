import { CompanyHolidayRepository } from "@/infrastructures/calendar/company-holiday-repository";
import type { PrismaClient } from "@prisma/client";

describe("CompanyHolidayRepository", () => {
  let prismaMock: {
    companyHoliday: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let repository: CompanyHolidayRepository;

  const dbRow = {
    id: 1,
    date: new Date("2026-01-01"),
    name: "元日",
    type: "NATIONAL",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  };

  beforeEach(() => {
    prismaMock = {
      companyHoliday: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    repository = new CompanyHolidayRepository(
      prismaMock as unknown as PrismaClient
    );
  });

  describe("findById", () => {
    it("存在するIDの場合、id/createdAt/updatedAtを含めて返すこと", async () => {
      prismaMock.companyHoliday.findUnique.mockResolvedValue(dbRow);

      const result = await repository.findById(1);

      expect(prismaMock.companyHoliday.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: 1,
        date: dbRow.date,
        name: "元日",
        type: "NATIONAL",
        createdAt: dbRow.createdAt,
        updatedAt: dbRow.updatedAt,
      });
    });

    it("存在しないIDの場合、nullを返すこと", async () => {
      prismaMock.companyHoliday.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("findByDateExcludingId", () => {
    it("自分以外の同一日付レコードが存在する場合、それを返すこと", async () => {
      prismaMock.companyHoliday.findFirst.mockResolvedValue(dbRow);

      const result = await repository.findByDateExcludingId(dbRow.date, 2);

      expect(prismaMock.companyHoliday.findFirst).toHaveBeenCalledWith({
        where: { date: dbRow.date, id: { not: 2 } },
      });
      expect(result?.id).toBe(1);
    });

    it("存在しない場合、nullを返すこと", async () => {
      prismaMock.companyHoliday.findFirst.mockResolvedValue(null);

      const result = await repository.findByDateExcludingId(dbRow.date, 1);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("休日を更新し、更新後の値を返すこと", async () => {
      const updated = { ...dbRow, name: "元日(更新)" };
      prismaMock.companyHoliday.update.mockResolvedValue(updated);

      const result = await repository.update(1, {
        date: dbRow.date,
        name: "元日(更新)",
        type: "NATIONAL",
      });

      expect(prismaMock.companyHoliday.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          date: dbRow.date,
          name: "元日(更新)",
          type: "NATIONAL",
        },
      });
      expect(result.name).toBe("元日(更新)");
      expect(result.id).toBe(1);
    });
  });

  describe("findAll", () => {
    it("id/createdAt/updatedAtを含めて一覧を返すこと", async () => {
      prismaMock.companyHoliday.findMany.mockResolvedValue([dbRow]);

      const result = await repository.findAll();

      expect(result).toEqual([
        {
          id: 1,
          date: dbRow.date,
          name: "元日",
          type: "NATIONAL",
          createdAt: dbRow.createdAt,
          updatedAt: dbRow.updatedAt,
        },
      ]);
    });
  });
});
