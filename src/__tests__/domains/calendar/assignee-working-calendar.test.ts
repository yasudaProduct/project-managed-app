import { AssigneeWorkingCalendar, UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';

describe('AssigneeWorkingCalendar', () => {
  let companyCalendar: CompanyCalendar;

  beforeEach(() => {
    companyCalendar = new CompanyCalendar(8);
  });

  const createAssignee = (rate: number, userId = 'user-1') =>
    WbsAssignee.create({ wbsId: 1, userId, rate });

  const createSchedule = (
    overrides: Partial<UserSchedule> & { date: Date }
  ): UserSchedule => ({
    id: 1,
    userId: 'user-1',
    startTime: '09:00',
    endTime: '10:00',
    title: '会議',
    ...overrides,
  });

  describe('isWorkingDay', () => {
    it('通常の平日は稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2026-05-25 は月曜日
      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(true);
    });

    it('土曜日は非稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2026-05-23 は土曜日
      expect(calendar.isWorkingDay(new Date(2026, 4, 23))).toBe(false);
    });

    it('日曜日は非稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2026-05-24 は日曜日
      expect(calendar.isWorkingDay(new Date(2026, 4, 24))).toBe(false);
    });

    it('「有給」タイトルのスケジュールがある日は非稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        title: '有給',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(false);
    });

    it('「休暇」タイトルのスケジュールがある日は非稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        title: '休暇',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(false);
    });

    it.each(['休み', '全休', '代休', '振休', '有給休暇'])(
      '「%s」タイトルのスケジュールがある日は非稼働日と判定される',
      (title) => {
        const assignee = createAssignee(1.0);
        const schedule = createSchedule({
          date: new Date(2026, 4, 25),
          title,
        });
        const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

        expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(false);
      }
    );

    it('稼働率が0の担当者は非稼働日と判定される', () => {
      const assignee = createAssignee(0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(false);
    });

    it('通常の会議予定では稼働日と判定される', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        title: '定例会議',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(true);
    });

    it('別ユーザーの休暇スケジュールは影響しない', () => {
      const assignee = createAssignee(1.0, 'user-1');
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        userId: 'user-2',
        title: '有給',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      expect(calendar.isWorkingDay(new Date(2026, 4, 25))).toBe(true);
    });
  });

  describe('getAvailableHours', () => {
    it('予定なしの場合は基準時間を返す', () => {
      const assignee = createAssignee(1.0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2026-05-25 は月曜日
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(8);
    });

    it('非稼働日は0を返す', () => {
      const assignee = createAssignee(1.0);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // 2026-05-23 は土曜日
      expect(calendar.getAvailableHours(new Date(2026, 4, 23))).toBe(0);
    });

    it('個人予定がある場合は予定時間分が控除される', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        startTime: '10:00',
        endTime: '12:00',
        title: '会議',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      // 8時間 - 2時間 = 6時間
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(6);
    });

    it('複数の個人予定がある場合は合計時間分が控除される', () => {
      const assignee = createAssignee(1.0);
      const schedules: UserSchedule[] = [
        createSchedule({
          id: 1,
          date: new Date(2026, 4, 25),
          startTime: '10:00',
          endTime: '11:00',
          title: '会議1',
        }),
        createSchedule({
          id: 2,
          date: new Date(2026, 4, 25),
          startTime: '14:00',
          endTime: '15:30',
          title: '会議2',
        }),
      ];
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, schedules);

      // 8時間 - (1時間 + 1.5時間) = 5.5時間
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(5.5);
    });

    it('参画率0.5の担当者は基準時間の半分が上限になる', () => {
      const assignee = createAssignee(0.5);
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, []);

      // min(8, 8 * 0.5) = 4
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(4);
    });

    it('個人予定控除後の時間が参画率上限より小さい場合は個人予定控除後の時間を返す', () => {
      const assignee = createAssignee(0.8);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        startTime: '09:00',
        endTime: '14:00',
        title: '出張',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      // rawAvailable = 8 - 5 = 3, rateCap = 8 * 0.8 = 6.4, min(3, 6.4) = 3
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(3);
    });

    it('個人予定の合計が基準時間を超える場合は基準時間で上限クランプされる', () => {
      const assignee = createAssignee(1.0);
      const schedules: UserSchedule[] = [
        createSchedule({
          id: 1,
          date: new Date(2026, 4, 25),
          startTime: '09:00',
          endTime: '17:00',
          title: '出張',
        }),
        createSchedule({
          id: 2,
          date: new Date(2026, 4, 25),
          startTime: '18:00',
          endTime: '20:00',
          title: '懇親会',
        }),
      ];
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, schedules);

      // sumScheduledHours = min(8, 8 + 2) = 8, rawAvailable = max(0, 8 - 8) = 0
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(0);
    });

    it('全日休暇の予定がある場合は0を返す', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        title: '有給',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(0);
    });

    it('30分単位の予定が正しく計算される', () => {
      const assignee = createAssignee(1.0);
      const schedule = createSchedule({
        date: new Date(2026, 4, 25),
        startTime: '09:30',
        endTime: '10:15',
        title: '朝会',
      });
      const calendar = new AssigneeWorkingCalendar(assignee, companyCalendar, [schedule]);

      // 8 - 0.75 = 7.25
      expect(calendar.getAvailableHours(new Date(2026, 4, 25))).toBe(7.25);
    });
  });
});
