import { FreeTimeApplicationService } from "@/applications/schedule/free-time-application-service";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { ICompanyHolidayRepository } from "@/applications/calendar/icompany-holiday-repository";
import type { IUserRepository } from "@/applications/user/iuser-repository";
import { User } from "@/domains/user/user";

describe("FreeTimeApplicationService", () => {
  let userScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let companyHolidayRepository: jest.Mocked<ICompanyHolidayRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let service: FreeTimeApplicationService;

  const makeUser = (id: string, name: string) =>
    User.createFromDb({
      id,
      name,
      email: `${id}@example.com`,
      displayName: name,
      costPerHour: 3000,
    });

  beforeEach(() => {
    // 「今日」= 2026-07-29(水・平日) に固定
    jest.useFakeTimers().setSystemTime(new Date("2026-07-29T10:00:00Z"));

    userScheduleRepository = {
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
      findByUsersAndDateRange: jest.fn().mockResolvedValue([]),
      findByUserIdAndDate: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replaceAll: jest.fn(),
    };

    companyHolidayRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByDateRange: jest.fn().mockResolvedValue([]),
      findByDate: jest.fn(),
      findByDateExcludingId: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    userRepository = {
      findAll: jest.fn().mockResolvedValue([
        makeUser("u1", "山田太郎"),
        makeUser("u2", "佐藤花子"),
      ]),
      findByWbsDisplayName: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    service = new FreeTimeApplicationService(
      userScheduleRepository,
      companyHolidayRepository,
      userRepository
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("searchFreeTime", () => {
    it("条件未指定の場合、全ユーザー・今日から1週間で検索し、解決済み条件を返すこと", async () => {
      const result = await service.searchFreeTime({});

      expect(userScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledWith(
        ["u1", "u2"],
        new Date("2026-07-29T00:00:00.000Z"),
        new Date("2026-08-05T00:00:00.000Z")
      );
      expect(companyHolidayRepository.findByDateRange).toHaveBeenCalledWith(
        new Date("2026-07-29T00:00:00.000Z"),
        new Date("2026-08-05T00:00:00.000Z")
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.conditions).toEqual({
        users: [
          { id: "u1", name: "山田太郎" },
          { id: "u2", name: "佐藤花子" },
        ],
        startDate: "2026-07-29",
        endDate: "2026-08-05",
        minDurationMinutes: 0,
        windowStartTime: "09:00",
        windowEndTime: "18:00",
      });
      // 2026-08-01(土)・08-02(日)は除外される
      expect(result.data.days.map((d) => d.date)).toEqual([
        "2026-07-29",
        "2026-07-30",
        "2026-07-31",
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
      ]);
    });

    it("userIds指定時は指定ユーザーのみで検索されること", async () => {
      const result = await service.searchFreeTime({
        userIds: ["u1"],
        startDate: "2026-07-29",
        endDate: "2026-07-29",
      });

      expect(userScheduleRepository.findByUsersAndDateRange).toHaveBeenCalledWith(
        ["u1"],
        new Date("2026-07-29T00:00:00.000Z"),
        new Date("2026-07-29T00:00:00.000Z")
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.conditions.users).toEqual([
        { id: "u1", name: "山田太郎" },
      ]);
    });

    it("存在しないユーザーIDが指定された場合はエラーを返し、スケジュールを検索しないこと", async () => {
      const result = await service.searchFreeTime({ userIds: ["u1", "zzz"] });

      expect(result).toEqual({
        success: false,
        error: "存在しないユーザーが指定されています",
      });
      expect(userScheduleRepository.findByUsersAndDateRange).not.toHaveBeenCalled();
    });

    it("空き時間が分からHH:mm形式のDTOへ変換されること", async () => {
      userScheduleRepository.findByUsersAndDateRange.mockResolvedValue([
        {
          id: 1,
          userId: "u1",
          date: new Date("2026-07-29"),
          startTime: "10:00",
          endTime: "12:30",
          title: "会議",
        },
      ]);

      const result = await service.searchFreeTime({
        userIds: ["u1"],
        startDate: "2026-07-29",
        endDate: "2026-07-29",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.days).toEqual([
        {
          date: "2026-07-29",
          slots: [
            { startTime: "09:00", endTime: "10:00", durationMinutes: 60 },
            { startTime: "12:30", endTime: "18:00", durationMinutes: 330 },
          ],
        },
      ]);
    });

    it("期間が92日ちょうどは成功し、92日を超える場合はエラーを返すこと", async () => {
      // 2026-07-29〜2026-10-28 = 両端含み92日
      const ok = await service.searchFreeTime({
        startDate: "2026-07-29",
        endDate: "2026-10-28",
      });
      expect(ok.success).toBe(true);

      // 2026-07-29〜2026-10-29 = 93日
      const over = await service.searchFreeTime({
        startDate: "2026-07-29",
        endDate: "2026-10-29",
      });
      expect(over).toEqual({
        success: false,
        error: "検索期間は92日以内で指定してください",
      });
    });

    it("終了日が開始日より前の場合はエラーを返すこと", async () => {
      const result = await service.searchFreeTime({
        startDate: "2026-07-29",
        endDate: "2026-07-28",
      });

      expect(result).toEqual({
        success: false,
        error: "終了日は開始日以降の日付を指定してください",
      });
    });

    it("最低空き時間が反映され、未満のスロットが除外されること", async () => {
      // u1 10:00-17:30 → 空きは 09:00-10:00(60分) と 17:30-18:00(30分)
      userScheduleRepository.findByUsersAndDateRange.mockResolvedValue([
        {
          id: 1,
          userId: "u1",
          date: new Date("2026-07-29"),
          startTime: "10:00",
          endTime: "17:30",
          title: "作業",
        },
      ]);

      const result = await service.searchFreeTime({
        userIds: ["u1"],
        startDate: "2026-07-29",
        endDate: "2026-07-29",
        minDurationMinutes: 60,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.conditions.minDurationMinutes).toBe(60);
      expect(result.data.days).toEqual([
        {
          date: "2026-07-29",
          slots: [{ startTime: "09:00", endTime: "10:00", durationMinutes: 60 }],
        },
      ]);
    });

    it("会社休日が結果から除外されること", async () => {
      companyHolidayRepository.findByDateRange.mockResolvedValue([
        { date: new Date("2026-07-30"), name: "創立記念日", type: "COMPANY" },
      ]);

      const result = await service.searchFreeTime({
        startDate: "2026-07-29",
        endDate: "2026-07-31",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.days.map((d) => d.date)).toEqual([
        "2026-07-29",
        "2026-07-31",
      ]);
    });

    it("ユーザーが1人も存在しない場合はエラーを返すこと", async () => {
      userRepository.findAll.mockResolvedValue([]);

      const result = await service.searchFreeTime({});

      expect(result).toEqual({
        success: false,
        error: "検索対象のユーザーがいません",
      });
    });
  });
});
