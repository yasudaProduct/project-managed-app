import 'reflect-metadata';
import { ForecastApplicationService } from '@/applications/forecast/forecast-application-service';
import type {
  IWbsQueryRepository,
  WbsTaskData,
} from '@/applications/wbs/query/iwbs-query-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import type { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { SystemSettings } from '@/domains/system-settings/system-settings';

describe('ForecastApplicationService.calculateTasksForecastDates', () => {
  let service: ForecastApplicationService;
  let mockWbsQueryRepository: jest.Mocked<IWbsQueryRepository>;
  let mockSystemSettingsRepository: jest.Mocked<ISystemSettingsRepository>;
  let mockCompanyHolidayRepository: jest.Mocked<ICompanyHolidayRepository>;

  // 2026-07-08 は水曜日（営業日）
  const baseDate = new Date(2026, 6, 8);

  const createTask = (overrides: Partial<WbsTaskData> = {}): WbsTaskData => ({
    id: '1',
    no: 'D1-0001',
    name: 'テストタスク',
    kijunKosu: null,
    yoteiKosu: 20,
    jissekiKosu: 10,
    kijunStart: null,
    kijunEnd: null,
    yoteiStart: new Date(2026, 6, 1),
    yoteiEnd: new Date(2026, 6, 15),
    jissekiStart: new Date(2026, 6, 2),
    jissekiEnd: null,
    progressRate: 50,
    status: 'IN_PROGRESS',
    phase: null,
    assignee: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockWbsQueryRepository = {
      getWbsTasks: jest.fn().mockResolvedValue([]),
      getPhases: jest.fn(),
      getTaskActualHoursByMonth: jest.fn(),
      getUnlinkedWorkRecordsCount: jest.fn(),
    };
    mockSystemSettingsRepository = {
      get: jest.fn().mockResolvedValue(SystemSettings.create(7.5)),
      update: jest.fn(),
    };
    mockCompanyHolidayRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByDateRange: jest.fn(),
      findByDate: jest.fn(),
      findByDateExcludingId: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new ForecastApplicationService(
      mockWbsQueryRepository,
      mockSystemSettingsRepository,
      mockCompanyHolidayRepository
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('実績開始があり残工数が正の場合、開始日=実績開始日・終了日を営業日ベースで返す', async () => {
    // realistic + 進捗50%: 見通し = 20/50*100*0.5 + (10 + 20*0.5)*0.5 = 20h → 残10h → 2営業日
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([createTask()]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );

    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe('1');
    expect(result[0].forecastHours).toBe(20);
    expect(result[0].actualHours).toBe(10);
    expect(result[0].remainingHours).toBe(10);
    expect(result[0].forecastStartDate).toEqual(new Date(2026, 6, 2));
    expect(result[0].forecastEndDate).toEqual(new Date(2026, 6, 9));
  });

  it('実績開始がないタスクは見通し日付をnullで返す', async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      createTask({ jissekiStart: null, jissekiKosu: null, status: 'NOT_STARTED', progressRate: 0 }),
    ]);

    const result = await service.calculateTasksForecastDates(1, undefined, baseDate);

    expect(result[0].forecastStartDate).toBeNull();
    expect(result[0].forecastEndDate).toBeNull();
  });

  it('完了タスクは見通し日付をnullで返す', async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      createTask({ status: 'COMPLETED', progressRate: 100, jissekiEnd: new Date(2026, 6, 5) }),
    ]);

    const result = await service.calculateTasksForecastDates(1, undefined, baseDate);

    expect(result[0].forecastStartDate).toBeNull();
    expect(result[0].forecastEndDate).toBeNull();
  });

  it('見通し工数が実績工数以下の場合は終了日をnullで返す', async () => {
    // 進捗100%（未完了ステータス）→ 見通し = 実績 → 残0
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      createTask({ progressRate: 100 }),
    ]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );

    expect(result[0].remainingHours).toBe(0);
    expect(result[0].forecastEndDate).toBeNull();
  });

  it('見通し算出方式(options.method)が反映される', async () => {
    // 進捗25%・実績10h・予定20h
    // conservative: 10/25*100 = 40h → 残30h → 4営業日(7/8,9,10,13) → 7/13
    // optimistic: 10 + 20*0.75 = 25h → 残15h → 2営業日 → 7/9
    const task = createTask({ progressRate: 25 });
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([task]);

    const conservative = await service.calculateTasksForecastDates(
      1,
      { method: 'conservative', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );
    const optimistic = await service.calculateTasksForecastDates(
      1,
      { method: 'optimistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );

    expect(conservative[0].forecastEndDate).toEqual(new Date(2026, 6, 13));
    expect(optimistic[0].forecastEndDate).toEqual(new Date(2026, 6, 9));
  });

  it('システム設定の基本稼働時間が反映される', async () => {
    // 残10h @4h/日 → 3営業日(7/8,9,10) → 7/10
    mockSystemSettingsRepository.get.mockResolvedValue(SystemSettings.create(4));
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([createTask()]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );

    expect(result[0].forecastEndDate).toEqual(new Date(2026, 6, 10));
  });

  it('会社休日をスキップして終了日を算出する', async () => {
    // 残10h @7.5h/日 → 2営業日。7/9が会社休日 → 7/8,7/10 → 7/10
    mockCompanyHolidayRepository.findAll.mockResolvedValue([
      { date: new Date(2026, 6, 9), name: '創立記念日', type: 'COMPANY' },
    ]);
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([createTask()]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate
    );

    expect(result[0].forecastEndDate).toEqual(new Date(2026, 6, 10));
  });

  it('複数タスクでも各リポジトリの呼び出しは1回ずつ(N+1なし)', async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      createTask({ id: '1' }),
      createTask({ id: '2' }),
      createTask({ id: '3' }),
    ]);

    const result = await service.calculateTasksForecastDates(1, undefined, baseDate);

    expect(result).toHaveLength(3);
    expect(mockWbsQueryRepository.getWbsTasks).toHaveBeenCalledTimes(1);
    expect(mockSystemSettingsRepository.get).toHaveBeenCalledTimes(1);
    expect(mockCompanyHolidayRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('定常タスクは定常方式で見通し工数を算出し、終了日を日次消費ペースで求める', async () => {
    // 定常タスク「定例会議」: 予定期間 2026-07-01〜07-31（稼働22日）、
    // 基準日 2026-07-08 時点の経過稼働日数 6日、実績6h。
    // ACTUAL_PACE: 日次ペース = 6/6 = 1h/日, 見通し = 1 × 22 = 22h, 残 = 22 - 6 = 16h。
    // 残16hを 1h/日 で消化 → 基準日から16営業日目の 2026-07-30 が終了日
    // （7/20 海の日はスキップ）。
    const task = createTask({
      name: '定例会議',
      yoteiKosu: 40,
      jissekiKosu: 6,
      yoteiStart: new Date(2026, 6, 1),
      yoteiEnd: new Date(2026, 6, 31),
      jissekiStart: new Date(2026, 6, 2),
      progressRate: 50,
      status: 'IN_PROGRESS',
    });
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([task]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate,
      { keywords: ['定例'], mode: 'ACTUAL_PACE' }
    );

    expect(result[0].forecastHours).toBeCloseTo(22, 5);
    expect(result[0].actualHours).toBe(6);
    expect(result[0].remainingHours).toBeCloseTo(16, 5);
    expect(result[0].forecastStartDate).toEqual(new Date(2026, 6, 2));
    expect(result[0].forecastEndDate).toEqual(new Date(2026, 6, 30));
  });

  it('定常キーワードに一致しないタスクは従来どおり進捗率ベースで算出する', async () => {
    // steadyConfig を渡しても、名前が一致しなければ通常方式（realistic）
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([createTask()]);

    const result = await service.calculateTasksForecastDates(
      1,
      { method: 'realistic', progressMeasurementMethod: 'SELF_REPORTED' },
      baseDate,
      { keywords: ['定例'], mode: 'ACTUAL_PACE' }
    );

    // createTask は進捗50%・実績10h・予定20h → realistic 見通し20h（既存テストと同値）
    expect(result[0].forecastHours).toBe(20);
    expect(result[0].forecastEndDate).toEqual(new Date(2026, 6, 9));
  });

  it('taskIdは文字列に正規化される($queryRaw由来でnumberの場合がある)', async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      createTask({ id: 123 as unknown as string }),
    ]);

    const result = await service.calculateTasksForecastDates(1, undefined, baseDate);

    expect(result[0].taskId).toBe('123');
  });
});
