import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { ProgressMeasurementMethod } from '@prisma/client';

describe('EvmMetrics', () => {
  describe('基本的なEVM指標の計算', () => {

    it('PVが0の場合、SPIは0を返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 0,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      expect(metrics.spi).toBe(0);
    });

    it('ACが0の場合、CPIは0を返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 0,
        bac: 200,
      });

      expect(metrics.cpi).toBe(0);
    });
  });

  describe('予測指標の計算', () => {
    it('EAC（完了時総コスト予測）を正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      // EAC = AC + ETC
      // ETC = (BAC - EV) / CPI = (200 - 80) / (80/90) = 120 / 0.888... ≈ 135
      // EAC = 90 + 135 ≈ 225
      expect(metrics.eac).toBeCloseTo(225, 1);
    });

    it('ETC（完了までの残コスト予測）を正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      // ETC = (BAC - EV) / CPI = (200 - 80) / (80/90) = 120 / 0.888... ≈ 135
      expect(metrics.etc).toBeCloseTo(135, 1);
    });

    it('VAC（完了時差異予測）を正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      // VAC = BAC - EAC = 200 - 225 = -25
      expect(metrics.vac).toBeCloseTo(-25, 1);
    });

    it('CPIが0の場合、ETCはInfinityを返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 0,
        ac: 90,
        bac: 200,
      });

      // CPI = 0 の場合、ETC = (BAC - EV) / CPI = (200 - 0) / 0 = Infinity
      expect(metrics.etc).toBe(Infinity);
    });

    it('CPI > 1 の場合、ETCは残工数を正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 120,
        ac: 90,
        bac: 200,
      });

      // CPI = 120 / 90 = 1.333
      // ETC = (BAC - EV) / CPI = (200 - 120) / 1.333 ≈ 60
      expect(metrics.etc).toBeCloseTo(60, 0);
    });
  });

  describe('完了率の計算', () => {
    it('完了率を正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      expect(metrics.completionRate).toBe(40); // (EV / BAC) * 100 = (80 / 200) * 100 = 40
    });

    it('BACが0の場合、完了率は0を返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 0,
      });

      expect(metrics.completionRate).toBe(0);
    });

    it('EVがBACを超える場合、100%以上を返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 220,
        ac: 90,
        bac: 200,
      });

      expect(metrics.completionRate).toBeCloseTo(110, 1);
    });
  });

  describe('健全性判定', () => {
    it('CPI ≥ 0.9 かつ SPI ≥ 0.9 の場合、healthyを返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 95,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('healthy');
    });

    it('CPI ≥ 0.8 かつ SPI ≥ 0.8 の場合、warningを返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 85,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('warning');
    });

    it('CPI < 0.8 または SPI < 0.8 の場合、criticalを返す', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 75,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('critical');
    });
  });

  describe('算出方式（工数/金額）のフォーマット', () => {
    it('工数ベースの場合、時間単位でフォーマットする', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100.5,
        ev: 80.75,
        ac: 90.25,
        bac: 200,
        calculationMode: 'hours',
      });

      expect(metrics.formattedPv).toBe('100.5h');
      expect(metrics.formattedEv).toBe('80.8h');
      expect(metrics.formattedAc).toBe('90.3h');
      expect(metrics.formattedBac).toBe('200.0h');
    });

    it('金額ベースの場合、円単位でフォーマットする', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 1000000,
        pv: 1000000,
        ev: 800000,
        ac: 900000,
        bac: 2000000,
        calculationMode: 'cost',
      });

      expect(metrics.formattedPv).toBe('¥1,000,000');
      expect(metrics.formattedEv).toBe('¥800,000');
      expect(metrics.formattedAc).toBe('¥900,000');
      expect(metrics.formattedBac).toBe('¥2,000,000');
    });
  });

  describe('進捗率測定方法の設定', () => {
    it('デフォルトでSELF_REPORTEDを使用する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      expect(metrics.progressMethod).toBe('SELF_REPORTED');
    });

    it('ZERO_HUNDREDを設定できる', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        progressMethod: 'ZERO_HUNDRED' as ProgressMeasurementMethod,
      });

      expect(metrics.progressMethod).toBe('ZERO_HUNDRED');
    });

    it('FIFTY_FIFTYを設定できる', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        progressMethod: 'FIFTY_FIFTY' as ProgressMeasurementMethod,
      });

      expect(metrics.progressMethod).toBe('FIFTY_FIFTY');
    });
  });

  describe('createファクトリメソッド', () => {
    it('必須パラメータでインスタンスを作成できる', () => {
      const metrics = EvmMetrics.create({
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        date: new Date('2025-01-01'),
      });

      expect(metrics.pv).toBe(100);
      expect(metrics.ev).toBe(80);
      expect(metrics.ac).toBe(90);
      expect(metrics.bac).toBe(0); // デフォルト値
      expect(metrics.calculationMode).toBe('hours'); // デフォルト値
      expect(metrics.progressMethod).toBe('SELF_REPORTED'); // デフォルト値
    });

    it('すべてのパラメータを指定してインスタンスを作成できる', () => {
      const metrics = EvmMetrics.create({
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        date: new Date('2025-01-01'),
        bac: 200,
        calculationMode: 'cost',
        progressMethod: 'FIFTY_FIFTY' as ProgressMeasurementMethod,
      });

      expect(metrics.pv).toBe(100);
      expect(metrics.ev).toBe(80);
      expect(metrics.ac).toBe(90);
      expect(metrics.bac).toBe(200);
      expect(metrics.calculationMode).toBe('cost');
      expect(metrics.progressMethod).toBe('FIFTY_FIFTY');
    });
  });
});
