import { GetWbsSummaryHandler } from '@/applications/wbs/query/get-wbs-summary-handler';
import { GetWbsSummaryQuery } from '@/applications/wbs/query/get-wbs-summary-query';
import { AllocationCalculationMode } from '@/applications/wbs/query/allocation-calculation-mode';
import type { IWbsQueryRepository, WbsTaskData, PhaseData } from '@/applications/wbs/query/iwbs-query-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { IProjectSettingsRepository } from '@/applications/project-settings/iproject-settings-repository';
import { DEFAULT_SCHEDULING_SETTINGS } from '@/types/scheduling-settings';

const makeTask = (overrides: Partial<WbsTaskData>): WbsTaskData => ({
  id: 't1',
  no: '1',
  name: 'Task 1',
  kijunKosu: null,
  yoteiKosu: 40,
  jissekiKosu: 20,
  kijunStart: null,
  kijunEnd: null,
  yoteiStart: new Date('2025-01-10'),
  yoteiEnd: new Date('2025-02-05'),
  jissekiStart: null,
  jissekiEnd: null,
  progressRate: 50,
  status: 'IN_PROGRESS',
  phase: { id: 1, name: '設計' },
  assignee: { id: 'a1', displayName: '田中' },
  ...overrides,
});

describe('GetWbsSummaryHandler monthlyPhaseSummary (server-side pre-aggregation)', () => {
  let wbsRepo: IWbsQueryRepository;
  let holidayRepo: ICompanyHolidayRepository;
  let scheduleRepo: IUserScheduleRepository;
  let assigneeRepo: IWbsAssigneeRepository;
  let systemRepo: ISystemSettingsRepository;
  let projectSettingsRepo: IProjectSettingsRepository;

  beforeEach(() => {
    const tasks: WbsTaskData[] = [
      makeTask({}),
      makeTask({
        id: 't2',
        no: '2',
        name: 'Task 2',
        yoteiKosu: 30,
        jissekiKosu: 30,
        yoteiStart: new Date('2025-02-01'),
        yoteiEnd: new Date('2025-02-10'),
        progressRate: 100,
        status: 'COMPLETED',
        phase: { id: 2, name: '実装' },
        assignee: { id: 'a2', displayName: '佐藤' },
      }),
    ];
    const phases: PhaseData[] = [
      { id: 1, name: '設計', seq: 1 },
      { id: 2, name: '実装', seq: 2 },
    ];

    wbsRepo = {
      getWbsTasks: jest.fn().mockResolvedValue(tasks),
      getPhases: jest.fn().mockResolvedValue(phases),
      getTaskActualHoursByMonth: jest.fn().mockResolvedValue([]),
      getUnlinkedWorkRecordsCount: jest.fn().mockResolvedValue(0),
    };
    holidayRepo = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findByDateRange: jest.fn().mockResolvedValue([]),
      findByDate: jest.fn().mockResolvedValue(null),
      findByDateExcludingId: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      saveMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as ICompanyHolidayRepository;
    scheduleRepo = {
      findAll: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByUserIdAndDateRange: jest.fn().mockResolvedValue([]),
      findByUsersAndDateRange: jest.fn().mockResolvedValue([]),
      findByUserIdAndDate: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      replaceAll: jest.fn(),
    } as IUserScheduleRepository;
    assigneeRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findByWbsId: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as IWbsAssigneeRepository;
    systemRepo = {
      get: jest.fn().mockResolvedValue({ standardWorkingHours: 7.5 }),
      update: jest.fn(),
    } as ISystemSettingsRepository;
    projectSettingsRepo = {
      findByProjectId: jest.fn().mockResolvedValue({
        projectId: 'proj-1',
        roundToQuarter: true,
        progressMeasurementMethod: 'SELF_REPORTED',
        forecastCalculationMethod: 'REALISTIC',
        evmForecastMethod: 'CPI_ONLY',
        deadlineAlertDays: 1,
        costOverrunThresholdPct: 100,
      }),
      upsertProjectSettings: jest.fn(),
      upsertDashboardSettings: jest.fn(),
      upsertEvmSettings: jest.fn(),
      findSchedulingSettings: jest.fn().mockResolvedValue(DEFAULT_SCHEDULING_SETTINGS),
      upsertSchedulingSettings: jest.fn(),
    } as IProjectSettingsRepository;
  });

  it('returns monthlyPhaseSummary alongside monthlyAssigneeSummary and forecast totals match across pivots (START_DATE_BASED)', async () => {
    const handler = new GetWbsSummaryHandler(
      wbsRepo,
      holidayRepo,
      scheduleRepo,
      assigneeRepo,
      systemRepo,
      projectSettingsRepo,
    );

    const query = new GetWbsSummaryQuery('proj-1', 123, AllocationCalculationMode.START_DATE_BASED);
    const result = await handler.execute(query);

    expect(result.monthlyAssigneeSummary).toBeDefined();
    expect(result.monthlyPhaseSummary).toBeDefined();

    const months = result.monthlyAssigneeSummary.months;
    expect(months).toContain('2025/01');
    expect(months).toContain('2025/02');

    const assigneeJan = result.monthlyAssigneeSummary.monthlyTotals['2025/01'];
    const assigneeFeb = result.monthlyAssigneeSummary.monthlyTotals['2025/02'];
    const phaseJan = result.monthlyPhaseSummary!.monthlyTotals['2025/01'];
    const phaseFeb = result.monthlyPhaseSummary!.monthlyTotals['2025/02'];

    expect(assigneeJan.forecastHours).toBeCloseTo(40);
    expect(assigneeFeb.forecastHours).toBeCloseTo(30);
    expect(phaseJan.forecastHours).toBeCloseTo(40);
    expect(phaseFeb.forecastHours).toBeCloseTo(30);

    expect(result.monthlyAssigneeSummary.grandTotal.forecastHours).toBeCloseTo(70);
    expect(result.monthlyPhaseSummary!.grandTotal.forecastHours).toBeCloseTo(70);
  });
});
