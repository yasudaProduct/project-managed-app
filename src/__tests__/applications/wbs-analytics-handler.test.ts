import { WbsAnalyticsHandler } from "@/applications/wbs/query/wbs-analytics-handler";
import { IWbsCrossQueryRepository, PhaseHoursSummary } from "@/applications/wbs/iwbs-cross-query-repository";
import { IWbsTagRepository } from "@/applications/wbs/iwbs-tag-repository";

describe('WbsAnalyticsHandler', () => {
  let handler: WbsAnalyticsHandler;
  let mockCrossQueryRepository: jest.Mocked<IWbsCrossQueryRepository>;
  let mockTagRepository: jest.Mocked<IWbsTagRepository>;

  const sampleSummary: PhaseHoursSummary[] = [
    { templateId: 1, phaseName: 'PM', phaseCode: 'PM', totalPlannedHours: 150, totalActualHours: 140, wbsCount: 5 },
    { templateId: 2, phaseName: '要件定義', phaseCode: 'RD', totalPlannedHours: 120, totalActualHours: 110, wbsCount: 5 },
    { templateId: 3, phaseName: '基本設計', phaseCode: 'BD', totalPlannedHours: 200, totalActualHours: 190, wbsCount: 5 },
    { templateId: 4, phaseName: '詳細設計', phaseCode: 'DD', totalPlannedHours: 300, totalActualHours: 280, wbsCount: 5 },
    { templateId: 5, phaseName: '実装', phaseCode: 'IM', totalPlannedHours: 600, totalActualHours: 550, wbsCount: 5 },
    { templateId: 6, phaseName: 'テスト', phaseCode: 'TE', totalPlannedHours: 280, totalActualHours: 260, wbsCount: 4 },
  ];

  beforeEach(() => {
    mockCrossQueryRepository = {
      getPhaseHoursSummary: jest.fn(),
    };

    mockTagRepository = {
      findByWbsId: jest.fn(),
      findAllDistinctNames: jest.fn(),
      addTag: jest.fn(),
      removeTag: jest.fn(),
      findWbsIdsByTagNames: jest.fn(),
    };

    handler = new WbsAnalyticsHandler(mockCrossQueryRepository, mockTagRepository);
  });

  describe('getCoefficients', () => {
    it('選択WBSの係数指標を取得できること', async () => {
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getCoefficients({
        filterType: 'wbs',
        wbsIds: [1],
        baseTemplateId: 3, // 基本設計を基準
        hoursType: 'planned',
      });

      expect(mockCrossQueryRepository.getPhaseHoursSummary).toHaveBeenCalledWith([1]);
      expect(result).toHaveLength(6);

      // 基本設計 = 1.0
      const bd = result.find(r => r.phaseCode === 'BD')!;
      expect(bd.coefficient).toBeCloseTo(1.0);
      expect(bd.isBase).toBe(true);

      // 実装 = 600/200 = 3.0
      const im = result.find(r => r.phaseCode === 'IM')!;
      expect(im.coefficient).toBeCloseTo(3.0);
    });

    it('実績工数で係数を計算できること', async () => {
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getCoefficients({
        filterType: 'wbs',
        wbsIds: [1],
        baseTemplateId: 3,
        hoursType: 'actual',
      });

      // 基本設計(実績) = 1.0
      const bd = result.find(r => r.phaseCode === 'BD')!;
      expect(bd.coefficient).toBeCloseTo(1.0);
      expect(bd.totalHours).toBe(190);

      // 実装(実績) = 550/190
      const im = result.find(r => r.phaseCode === 'IM')!;
      expect(im.coefficient).toBeCloseTo(550 / 190);
    });

    it('全体フィルタで係数を取得できること', async () => {
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getCoefficients({
        filterType: 'all',
        baseTemplateId: 3,
        hoursType: 'planned',
      });

      expect(mockCrossQueryRepository.getPhaseHoursSummary).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(6);
    });

    it('類似案件フィルタで係数を取得できること', async () => {
      mockTagRepository.findWbsIdsByTagNames.mockResolvedValue([1, 2, 3]);
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getCoefficients({
        filterType: 'tag',
        tagNames: ['WEB新規'],
        baseTemplateId: 3,
        hoursType: 'planned',
      });

      expect(mockTagRepository.findWbsIdsByTagNames).toHaveBeenCalledWith(['WEB新規']);
      expect(mockCrossQueryRepository.getPhaseHoursSummary).toHaveBeenCalledWith([1, 2, 3]);
      expect(result).toHaveLength(6);
    });

    it('類似案件で該当WBSがない場合は空を返すこと', async () => {
      mockTagRepository.findWbsIdsByTagNames.mockResolvedValue([]);

      const result = await handler.getCoefficients({
        filterType: 'tag',
        tagNames: ['存在しないタグ'],
        baseTemplateId: 3,
        hoursType: 'planned',
      });

      expect(result).toHaveLength(0);
      expect(mockCrossQueryRepository.getPhaseHoursSummary).not.toHaveBeenCalled();
    });
  });

  describe('getProportions', () => {
    it('全体に対する工程割合を取得できること', async () => {
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getProportions({
        filterType: 'all',
        hoursType: 'planned',
      });

      expect(result).toHaveLength(6);

      // 全体の合計: 150+120+200+300+600+280 = 1650
      const pm = result.find(r => r.phaseCode === 'PM')!;
      expect(pm.proportion).toBeCloseTo(150 / 1650);
    });

    it('カスタム母数で工程割合を取得できること', async () => {
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getProportions({
        filterType: 'all',
        hoursType: 'planned',
        customBaseTemplateIds: [3, 4, 5, 6], // 基本設計+詳細設計+実装+テスト
      });

      // カスタム母数: 200+300+600+280 = 1380
      const pm = result.find(r => r.phaseCode === 'PM')!;
      expect(pm.customProportion).toBeCloseTo(150 / 1380);
    });

    it('類似案件フィルタで工程割合を取得できること', async () => {
      mockTagRepository.findWbsIdsByTagNames.mockResolvedValue([1, 2]);
      mockCrossQueryRepository.getPhaseHoursSummary.mockResolvedValue(sampleSummary);

      const result = await handler.getProportions({
        filterType: 'tag',
        tagNames: ['DBリプレイス'],
        hoursType: 'actual',
      });

      expect(mockTagRepository.findWbsIdsByTagNames).toHaveBeenCalledWith(['DBリプレイス']);
      expect(mockCrossQueryRepository.getPhaseHoursSummary).toHaveBeenCalledWith([1, 2]);
      expect(result).toHaveLength(6);

      // 実績工数ベースで計算
      const total = 140 + 110 + 190 + 280 + 550 + 260;
      const pm = result.find(r => r.phaseCode === 'PM')!;
      expect(pm.proportion).toBeCloseTo(140 / total);
    });
  });
});
