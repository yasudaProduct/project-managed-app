import { UserScheduleRepository } from "@/infrastructures/calendar/user-schedule-repository";
import type { PrismaClient } from "@prisma/client";

describe("UserScheduleRepository", () => {
  let prismaMock: {
    userSchedule: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let repository: UserScheduleRepository;

  const dbRow = {
    id: 1,
    userId: "u1",
    date: new Date("2026-01-01"),
    startTime: "09:00",
    endTime: "10:00",
    title: "会議",
    location: null,
    description: null,
  };

  beforeEach(() => {
    prismaMock = {
      userSchedule: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    };
    repository = new UserScheduleRepository(prismaMock as unknown as PrismaClient);
  });

  describe("findAll", () => {
    it("すべてのユーザースケジュールを返すこと", async () => {
      prismaMock.userSchedule.findMany.mockResolvedValue([dbRow]);

      const result = await repository.findAll();

      expect(prismaMock.userSchedule.findMany).toHaveBeenCalledWith({
        orderBy: [{ date: "asc" }, { userId: "asc" }],
      });
      expect(result).toEqual([
        {
          id: 1,
          userId: "u1",
          date: new Date("2026-01-01"),
          startTime: "09:00",
          endTime: "10:00",
          title: "会議",
          location: undefined,
          description: undefined,
        },
      ]);
    });
  });

  describe("replaceAll", () => {
    it("既存のスケジュールを全削除してから新規作成すること", async () => {
      prismaMock.userSchedule.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.userSchedule.createMany.mockResolvedValue({ count: 2 });

      await repository.replaceAll([
        { userId: "u1", date: new Date("2026-01-01"), startTime: "09:00", endTime: "10:00", title: "会議" },
        { userId: "u2", date: new Date("2026-01-02"), startTime: "13:00", endTime: "14:00", title: "休暇" },
      ]);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userSchedule.deleteMany).toHaveBeenCalledWith({});
      expect(prismaMock.userSchedule.createMany).toHaveBeenCalledWith({
        data: [
          { userId: "u1", date: new Date("2026-01-01"), startTime: "09:00", endTime: "10:00", title: "会議", location: undefined, description: undefined },
          { userId: "u2", date: new Date("2026-01-02"), startTime: "13:00", endTime: "14:00", title: "休暇", location: undefined, description: undefined },
        ],
      });
    });
  });
});
