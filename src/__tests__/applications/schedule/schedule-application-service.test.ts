import { ScheduleApplicationService } from "@/applications/schedule/schedule-application-service";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IUserRepository } from "@/applications/user/iuser-repository";
import { User } from "@/domains/user/user";

describe("ScheduleApplicationService", () => {
  let userScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let service: ScheduleApplicationService;

  beforeEach(() => {
    userScheduleRepository = {
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndDateRange: jest.fn(),
      findByUsersAndDateRange: jest.fn(),
      findByUserIdAndDate: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replaceAll: jest.fn(),
    };

    userRepository = {
      findAll: jest.fn(),
      findByWbsDisplayName: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    service = new ScheduleApplicationService(userScheduleRepository, userRepository);
  });

  describe("getSchedules", () => {
    it("ユーザー名を結合したスケジュール一覧を返すこと", async () => {
      userScheduleRepository.findAll.mockResolvedValue([
        {
          id: 1,
          userId: "u1",
          date: new Date("2026-01-01"),
          startTime: "09:00",
          endTime: "10:00",
          title: "会議",
          location: "会議室",
          description: "定例",
        },
      ]);
      userRepository.findAll.mockResolvedValue([
        User.createFromDb({ id: "u1", name: "山田太郎", email: "yamada@example.com", displayName: "山田", costPerHour: 3000 }),
      ]);

      const result = await service.getSchedules();

      expect(result).toEqual([
        {
          id: 1,
          userId: "u1",
          name: "山田太郎",
          date: new Date("2026-01-01"),
          startTime: "09:00",
          endTime: "10:00",
          title: "会議",
          location: "会議室",
          description: "定例",
        },
      ]);
    });
  });

  describe("importScheduleTsv", () => {
    it("存在するユーザーの正しい形式のデータのみ取り込むこと", async () => {
      userRepository.findAll.mockResolvedValue([
        User.createFromDb({ id: "u1", name: "山田太郎", email: "yamada@example.com", displayName: "山田", costPerHour: 3000 }),
      ]);
      userScheduleRepository.replaceAll.mockResolvedValue(undefined);

      const result = await service.importScheduleTsv([
        {
          "個人ｺｰﾄﾞ": "u1",
          "氏名": "山田太郎",
          "登録区分": "",
          "年月日": "2026/01/01 00:00:00",
          "開始時間": "09:00",
          "終了時間": "10:00",
          "ﾀｲﾄﾙ": "会議",
          "場所": "会議室",
          "内容": "定例",
        },
        {
          // 存在しないユーザーはスキップされる
          "個人ｺｰﾄﾞ": "unknown",
          "氏名": "不明",
          "登録区分": "",
          "年月日": "2026/01/02 00:00:00",
          "開始時間": "09:00",
          "終了時間": "10:00",
          "ﾀｲﾄﾙ": "会議",
          "場所": "",
          "内容": "",
        },
      ]);

      expect(result).toEqual({ success: true });
      expect(userScheduleRepository.replaceAll).toHaveBeenCalledWith([
        {
          userId: "u1",
          date: new Date(2026, 0, 1),
          startTime: "09:00",
          endTime: "10:00",
          title: "会議",
          location: "会議室",
          description: "定例",
        },
      ]);
    });

    it("エラー時はsuccess: falseを返すこと", async () => {
      userRepository.findAll.mockRejectedValue(new Error("db error"));

      const result = await service.importScheduleTsv([]);

      expect(result.success).toBe(false);
    });
  });
});
