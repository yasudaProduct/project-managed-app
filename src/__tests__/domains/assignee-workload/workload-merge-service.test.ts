import { WorkloadMergeService, LabeledAllocationSet } from '@/domains/assignee-workload/workload-merge-service';
import { DailyWorkAllocation } from '@/domains/assignee-workload/daily-work-allocation';
import { TaskAllocation } from '@/domains/assignee-workload/task-allocation';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { AssigneeWorkingCalendar, UserSchedule } from '@/domains/calendar/assignee-working-calendar';

// 2026-05-25(月)基準。05-23(土)/05-24(日)は週末。
const SAT = new Date(2026, 4, 23);
const SUN = new Date(2026, 4, 24);
const MON = new Date(2026, 4, 25);
const TUE = new Date(2026, 4, 26);
const WED = new Date(2026, 4, 27);

describe('WorkloadMergeService', () => {
  const service = new WorkloadMergeService();

  const createSchedule = (overrides: Partial<UserSchedule> & { date: Date }): UserSchedule => ({
    id: 1,
    userId: 'user-1',
    startTime: '09:00',
    endTime: '10:00',
    title: '会議',
    ...overrides,
  });

  // 合算用のrate=1カレンダー(標準勤務時間−個人予定)
  const rate1Calendar = (companyCalendar: CompanyCalendar, userSchedules: UserSchedule[] = []) =>
    new AssigneeWorkingCalendar(
      WbsAssignee.create({ userId: 'user-1', rate: 1 }),
      companyCalendar,
      userSchedules
    );

  const alloc = (args: { taskId?: string; hours: number; projectName?: string }) =>
    TaskAllocation.create({
      taskId: args.taskId ?? 't-1',
      taskName: `タスク${args.taskId ?? 't-1'}`,
      allocatedHours: args.hours,
      totalHours: args.hours,
      projectName: args.projectName,
    });

  const day = (date: Date, availableHours: number, allocations: TaskAllocation[]) =>
    DailyWorkAllocation.create({ date, availableHours, taskAllocations: allocations });

  it('同一日の複数セットは配分工数を合算しタスク配分を連結する', () => {
    const companyCalendar = new CompanyCalendar(7.5);
    const sets: LabeledAllocationSet[] = [
      { projectName: 'PJ-A', dailyAllocations: [day(MON, 7.5, [alloc({ taskId: 'a-1', hours: 3 })])] },
      { projectName: 'PJ-B', dailyAllocations: [day(MON, 3.75, [alloc({ taskId: 'b-1', hours: 2 })])] },
    ];

    const merged = service.mergeDailyAllocations({
      sets,
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: MON,
      endDate: MON,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].allocatedHours).toBe(5);
    expect(merged[0].taskAllocations).toHaveLength(2);
    expect(merged[0].taskAllocations.map(t => t.projectName)).toEqual(['PJ-A', 'PJ-B']);
    // 分母はセット側のavailableHours(3.75等)ではなく合算カレンダー(7.5)
    expect(merged[0].availableHours).toBe(7.5);
  });

  it('合算時の稼働可能時間は標準勤務時間−個人予定(参画率キャップなし)', () => {
    const companyCalendar = new CompanyCalendar(7.5);
    const schedules = [createSchedule({ date: MON, startTime: '10:00', endTime: '12:00' })]; // 2h

    const merged = service.mergeDailyAllocations({
      // 参画率0.5のWBS由来のセット(availableHours=3.75)でも分母には影響しない
      sets: [{ projectName: 'PJ-A', dailyAllocations: [day(MON, 3.75, [alloc({ taskId: 'a-1', hours: 3 })])] }],
      mergedCalendar: rate1Calendar(companyCalendar, schedules),
      companyCalendar,
      userSchedules: schedules,
      startDate: MON,
      endDate: MON,
    });

    expect(merged[0].availableHours).toBe(5.5);
    expect(merged[0].userSchedules).toHaveLength(1);
    expect(merged[0].userSchedules[0].durationHours).toBe(2);
  });

  it('週末はavailableHours=0・isWeekend=true', () => {
    const companyCalendar = new CompanyCalendar(7.5);

    const merged = service.mergeDailyAllocations({
      sets: [],
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: SAT,
      endDate: SUN,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0].isWeekend).toBe(true);
    expect(merged[0].availableHours).toBe(0);
    expect(merged[1].isWeekend).toBe(true);
  });

  it('会社休日はisCompanyHoliday=true・availableHours=0', () => {
    const companyCalendar = new CompanyCalendar(7.5, [
      { date: MON, name: '創立記念日', type: 'COMPANY' },
    ]);

    const merged = service.mergeDailyAllocations({
      sets: [],
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: MON,
      endDate: MON,
    });

    expect(merged[0].isCompanyHoliday).toBe(true);
    expect(merged[0].availableHours).toBe(0);
  });

  it('範囲外の配分は無視し、セットの無い日もカレンダー由来の行を生成する', () => {
    const companyCalendar = new CompanyCalendar(7.5);
    const sets: LabeledAllocationSet[] = [
      {
        projectName: 'PJ-A',
        dailyAllocations: [
          day(MON, 7.5, [alloc({ taskId: 'a-1', hours: 2 })]), // 範囲外(前日)
          day(TUE, 7.5, [alloc({ taskId: 'a-2', hours: 3 })]), // 範囲内
        ],
      },
    ];

    const merged = service.mergeDailyAllocations({
      sets,
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: TUE,
      endDate: WED,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0].allocatedHours).toBe(3); // TUE
    expect(merged[1].allocatedHours).toBe(0); // WED: セット無し
    expect(merged[1].availableHours).toBe(7.5);
  });

  it('空のセットでも期間分の行を返す(稼働可能時間のみ)', () => {
    const companyCalendar = new CompanyCalendar(7.5);

    const merged = service.mergeDailyAllocations({
      sets: [],
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: MON,
      endDate: WED,
    });

    expect(merged).toHaveLength(3);
    expect(merged.every(d => d.allocatedHours === 0)).toBe(true);
    expect(merged[0].availableHours).toBe(7.5);
  });

  it('セットにprojectNameが無ければタスク配分側のprojectNameを保持する', () => {
    const companyCalendar = new CompanyCalendar(7.5);

    const merged = service.mergeDailyAllocations({
      sets: [
        { dailyAllocations: [day(MON, 7.5, [alloc({ taskId: 'a-1', hours: 2, projectName: '元PJ' })])] },
      ],
      mergedCalendar: rate1Calendar(companyCalendar),
      companyCalendar,
      userSchedules: [],
      startDate: MON,
      endDate: MON,
    });

    expect(merged[0].taskAllocations[0].projectName).toBe('元PJ');
  });
});
