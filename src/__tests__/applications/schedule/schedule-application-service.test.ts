import { ScheduleApplicationService } from "@/applications/schedule/schedule-application-service";
import type { IUserScheduleRepository } from "@/applications/calendar/iuser-schedule-repository";
import type { IUserRepository } from "@/applications/user/iuser-repository";
import { User } from "@/domains/user/user";
import type { OutlookCalendarRowDto } from "@/types/outlook-calendar";

const utc = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

const outlookRow = (overrides: Partial<OutlookCalendarRowDto> = {}): OutlookCalendarRowDto => ({
  rowNumber: 2,
  subject: "定例会議",
  startDate: "2026/11/2",
  startTime: "10:00:00",
  endDate: "2026/11/2",
  endTime: "11:00:00",
  allDay: "FALSE",
  location: "会議室A",
  description: "",
  showTimeAs: "2",
  ...overrides,
});

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
      replaceByUserIdAndDateRange: jest.fn(),
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

  describe("importOutlookSchedules", () => {
    const yamada = User.createFromDb({ id: "u1", name: "山田太郎", email: "yamada@example.com", displayName: "山田", costPerHour: 3000 });

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(yamada);
      userScheduleRepository.replaceByUserIdAndDateRange.mockResolvedValue(undefined);
    });

    it("稼働を妨げる予定だけを日ごとに分割し、ファイルの期間内の選択ユーザーの予定を置き換えること", async () => {
      const result = await service.importOutlookSchedules({
        userId: "u1",
        rows: [
          outlookRow({ rowNumber: 2 }),
          // 空き時間の終日予定（Outlookの終日予定の既定値）はスキップ
          outlookRow({
            rowNumber: 3,
            subject: "リリース日",
            startDate: "2026/11/5",
            startTime: "0:00:00",
            endDate: "2026/11/6",
            endTime: "0:00:00",
            allDay: "TRUE",
            showTimeAs: "3",
          }),
          // 外出中の複数日の終日予定は日ごとに分割
          outlookRow({
            rowNumber: 4,
            subject: "出張",
            startDate: "2026/11/10",
            startTime: "0:00:00",
            endDate: "2026/11/12",
            endTime: "0:00:00",
            allDay: "TRUE",
            location: "大阪",
            showTimeAs: "4",
          }),
          // 解釈できない行はエラーとして返す
          outlookRow({ rowNumber: 5, startDate: "不明" }),
        ],
      });

      expect(userRepository.findById).toHaveBeenCalledWith("u1");
      expect(userScheduleRepository.replaceByUserIdAndDateRange).toHaveBeenCalledWith(
        "u1",
        utc("2026-11-02"),
        utc("2026-11-11"),
        [
          { userId: "u1", date: utc("2026-11-02"), startTime: "10:00", endTime: "11:00", title: "定例会議", location: "会議室A", description: undefined },
          { userId: "u1", date: utc("2026-11-10"), startTime: "00:00", endTime: "24:00", title: "出張", location: "大阪", description: undefined },
          { userId: "u1", date: utc("2026-11-11"), startTime: "00:00", endTime: "24:00", title: "出張", location: "大阪", description: undefined },
        ]
      );
      expect(result).toEqual({
        success: true,
        data: {
          importedEventCount: 2,
          createdScheduleCount: 3,
          skippedEventCount: 1,
          periodStart: "2026-11-02",
          periodEnd: "2026-11-11",
          errors: [{ rowNumber: 5, message: "開始日が不正です（不明）" }],
        },
      });
    });

    it("スキップした予定の日付も置換期間に含めること", async () => {
      await service.importOutlookSchedules({
        userId: "u1",
        rows: [
          outlookRow({ rowNumber: 2 }),
          outlookRow({ rowNumber: 3, subject: "在宅勤務", startDate: "2026/11/30", endDate: "2026/11/30", showTimeAs: "0" }),
        ],
      });

      expect(userScheduleRepository.replaceByUserIdAndDateRange).toHaveBeenCalledWith(
        "u1",
        utc("2026-11-02"),
        utc("2026-11-30"),
        [expect.objectContaining({ title: "定例会議" })]
      );
    });

    it("全休タイトルの予定は空き時間でも取り込むこと", async () => {
      const result = await service.importOutlookSchedules({
        userId: "u1",
        rows: [
          outlookRow({ subject: "休暇", startTime: "", endTime: "", endDate: "", allDay: "TRUE", showTimeAs: "3" }),
        ],
      });

      expect(userScheduleRepository.replaceByUserIdAndDateRange).toHaveBeenCalledWith(
        "u1",
        utc("2026-11-02"),
        utc("2026-11-02"),
        [expect.objectContaining({ title: "休暇", startTime: "00:00", endTime: "24:00" })]
      );
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });

    it("取り込み先のユーザーが存在しない場合はエラーを返し、既存の予定を変更しないこと", async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await service.importOutlookSchedules({ userId: "unknown", rows: [outlookRow()] });

      expect(result).toEqual({ success: false, error: "取り込み先のユーザーが存在しません" });
      expect(userScheduleRepository.replaceByUserIdAndDateRange).not.toHaveBeenCalled();
    });

    it("有効な予定が1件もない場合はエラーを返し、既存の予定を変更しないこと", async () => {
      const result = await service.importOutlookSchedules({
        userId: "u1",
        rows: [outlookRow({ rowNumber: 2, startDate: "あした" }), outlookRow({ rowNumber: 3, startDate: "" })],
      });

      expect(result).toEqual({
        success: false,
        error: "取り込める予定がありません（2行目: 開始日が不正です（あした））",
      });
      expect(userScheduleRepository.replaceByUserIdAndDateRange).not.toHaveBeenCalled();
    });

    it("保存に失敗した場合はsuccess: falseを返すこと", async () => {
      userScheduleRepository.replaceByUserIdAndDateRange.mockRejectedValue(new Error("db error"));
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await service.importOutlookSchedules({ userId: "u1", rows: [outlookRow()] });

      expect(result).toEqual({ success: false, error: "スケジュールのインポートに失敗しました" });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
