import {
  ScatterPlotAnalyzer,
  ScatterDataPoint,
} from '@/domains/quality/services/scatter-plot-analyzer';
import { QualityThresholdConfig } from '@/domains/quality/entities/quality-threshold-config';

describe('ScatterPlotAnalyzer', () => {
  const analyzer = new ScatterPlotAnalyzer();

  const samplePoints: ScatterDataPoint[] = [
    { id: 't1', label: 'タスクA', x: 2.0, y: 0.5, group: 'ユーザー管理', groupType: 'subsystem' },
    { id: 't2', label: 'タスクB', x: 3.0, y: 1.0, group: 'ユーザー管理', groupType: 'subsystem' },
    { id: 't3', label: 'タスクC', x: 5.0, y: 2.0, group: '注文管理', groupType: 'subsystem' },
    { id: 't4', label: 'タスクD', x: 1.0, y: 0.3, group: '注文管理', groupType: 'subsystem' },
  ];

  describe('aggregate', () => {
    it('タスク別（集約なし）の場合はそのまま返す', () => {
      const result = analyzer.aggregate(samplePoints, 'none');
      expect(result).toHaveLength(4);
      expect(result[0].label).toBe('タスクA');
    });

    it('サブシステム別で集約する', () => {
      const result = analyzer.aggregate(samplePoints, 'subsystem');

      expect(result).toHaveLength(2);
      const userMgmt = result.find((p) => p.label === 'ユーザー管理');
      expect(userMgmt).toBeDefined();
      // x平均 = (2.0 + 3.0) / 2 = 2.5
      expect(userMgmt!.x).toBeCloseTo(2.5);
      // y平均 = (0.5 + 1.0) / 2 = 0.75
      expect(userMgmt!.y).toBeCloseTo(0.75);
    });

    it('グループが未設定のポイントは「未分類」に集約', () => {
      const points: ScatterDataPoint[] = [
        { id: 't1', label: 'A', x: 1, y: 1, groupType: 'subsystem' },
        { id: 't2', label: 'B', x: 2, y: 2, group: 'SS1', groupType: 'subsystem' },
      ];
      const result = analyzer.aggregate(points, 'subsystem');

      expect(result).toHaveLength(2);
      const unclassified = result.find((p) => p.label === '未分類');
      expect(unclassified).toBeDefined();
    });

    it('空配列の場合は空配列を返す', () => {
      expect(analyzer.aggregate([], 'subsystem')).toEqual([]);
    });
  });

  describe('classifyByZone', () => {
    it('ゾーン内のポイントを分類する', () => {
      const thresholdX = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'testDensity',
        upperLimit: 4.0,
        lowerLimit: 1.5,
      });
      const thresholdY = QualityThresholdConfig.create({
        wbsId: 1,
        metricKey: 'bugDensity',
        upperLimit: 1.5,
        lowerLimit: 0.2,
      });

      const result = analyzer.classifyByZone(samplePoints, thresholdX, thresholdY);

      // t1: x=2.0 in [1.5,4.0], y=0.5 in [0.2,1.5] → inZone
      expect(result.find((p) => p.id === 't1')!.zone).toBe('inZone');
      // t3: x=5.0 > 4.0 → outOfZone
      expect(result.find((p) => p.id === 't3')!.zone).toBe('outOfZone');
      // t4: x=1.0 < 1.5 → outOfZone
      expect(result.find((p) => p.id === 't4')!.zone).toBe('outOfZone');
    });

    it('閾値が未設定の場合はすべてinZone', () => {
      const result = analyzer.classifyByZone(samplePoints, undefined, undefined);
      expect(result.every((p) => p.zone === 'inZone')).toBe(true);
    });
  });
});
