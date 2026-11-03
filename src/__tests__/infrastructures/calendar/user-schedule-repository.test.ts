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

  describe("replaceByUserIdAndDateRange", () => {
    it("指定ユーザーの指定期間のスケジュールだけを削除してから新規作成すること", async () => {
      prismaMock.userSchedule.deleteMany.mockResolvedValue({ count: 3 });
      prismaMock.userSchedule.createMany.mockResolvedValue({ count: 1 });

      await repository.replaceByUserIdAndDateRange(
        "u1",
        new Date("2026-11-01"),
        new Date("2026-11-30"),
        [{ userId: "u1", date: new Date("2026-11-02"), startTime: "10:00", endTime: "11:00", title: "会議", location: "会議室A" }]
      );

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.userSchedule.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u1", date: { gte: new Date("2026-11-01"), lte: new Date("2026-11-30") } },
      });
      expect(prismaMock.userSchedule.createMany).toHaveBeenCalledWith({
        data: [
          { userId: "u1", date: new Date("2026-11-02"), startTime: "10:00", endTime: "11:00", title: "会議", location: "会議室A", description: undefined },
        ],
      });
      expect(prismaMock.userSchedule.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
        prismaMock.userSchedule.createMany.mock.invocationCallOrder[0]
      );
    });

    it("新規スケジュールが空の場合は削除のみ行うこと", async () => {
      prismaMock.userSchedule.deleteMany.mockResolvedValue({ count: 2 });

      await repository.replaceByUserIdAndDateRange("u1", new Date("2026-11-01"), new Date("2026-11-30"), []);

      expect(prismaMock.userSchedule.deleteMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.userSchedule.createMany).not.toHaveBeenCalled();
    });
  });
});
