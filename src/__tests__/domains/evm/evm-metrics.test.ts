import { EvmMetrics } from '@/domains/evm/evm-metrics';
import { ProgressMeasurementMethod } from '@/types/progress-measurement';

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

    it('CPIが0の場合、ETCは0を返す（ガード処理）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 0,
        ac: 90,
        bac: 200,
      });

      // CPI = 0 の場合、ゼロ除算を回避して0を返す
      expect(metrics.etc).toBe(0);
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

  describe('SV/CV計算', () => {
    it('SVを正しく計算する（EV > PV: スケジュール前倒し）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 80,
        ev: 100,
        ac: 90,
        bac: 200,
      });

      expect(metrics.sv).toBe(20); // EV - PV = 100 - 80 = 20
    });

    it('SVを正しく計算する（EV < PV: スケジュール遅延）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 60,
        ac: 90,
        bac: 200,
      });

      expect(metrics.sv).toBe(-40); // EV - PV = 60 - 100 = -40
    });

    it('CVを正しく計算する（EV > AC: コスト効率良い）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 100,
        ac: 80,
        bac: 200,
      });

      expect(metrics.cv).toBe(20); // EV - AC = 100 - 80 = 20
    });

    it('CVを正しく計算する（EV < AC: コスト超過）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 100,
        bac: 200,
      });

      expect(metrics.cv).toBe(-20); // EV - AC = 80 - 100 = -20
    });
  });

  describe('SPI/CPI計算', () => {
    it('SPIを正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 90,
        ac: 80,
        bac: 200,
      });

      expect(metrics.spi).toBeCloseTo(0.9, 2); // EV / PV = 90 / 100
    });

    it('CPIを正しく計算する', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 90,
        ac: 80,
        bac: 200,
      });

      expect(metrics.cpi).toBeCloseTo(1.125, 3); // EV / AC = 90 / 80
    });

    it('SPI > 1 の場合（スケジュール前倒し）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 80,
        ev: 100,
        ac: 90,
        bac: 200,
      });

      expect(metrics.spi).toBeCloseTo(1.25, 2); // 100 / 80
    });

    it('CPI > 1 の場合（コスト効率良い）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 100,
        ac: 80,
        bac: 200,
      });

      expect(metrics.cpi).toBeCloseTo(1.25, 2); // 100 / 80
    });
  });

  describe('isPredictedフラグ', () => {
    it('デフォルトではfalse', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
      });

      expect(metrics.isPredicted).toBe(false);
    });

    it('trueを指定できる', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        isPredicted: true,
      });

      expect(metrics.isPredicted).toBe(true);
    });
  });

  describe('フォーマット（SV/CV/EAC/ETC）', () => {
    it('工数ベースのSV/CVフォーマット', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        calculationMode: 'hours',
      });

      expect(metrics.formattedSv).toBe('-20.0h');
      expect(metrics.formattedCv).toBe('-10.0h');
    });

    it('金額ベースのSV/CVフォーマット', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 1000000,
        pv: 1000000,
        ev: 800000,
        ac: 900000,
        bac: 2000000,
        calculationMode: 'cost',
      });

      expect(metrics.formattedSv).toBe('¥-200,000');
      expect(metrics.formattedCv).toBe('¥-100,000');
    });

    it('工数ベースのEAC/ETCフォーマット', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        calculationMode: 'hours',
      });

      // CPI = 80/90 ≈ 0.889
      // ETC = (200-80) / (80/90) = 135
      // EAC = 90 + 135 = 225
      expect(metrics.formattedEtc).toMatch(/^\d+\.\dh$/);
      expect(metrics.formattedEac).toMatch(/^\d+\.\dh$/);
    });
  });

  describe('全値ゼロのエッジケース', () => {
    it('すべてゼロの場合、SV/CVは0', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 0,
        pv: 0,
        ev: 0,
        ac: 0,
        bac: 0,
      });

      expect(metrics.sv).toBe(0);
      expect(metrics.cv).toBe(0);
      expect(metrics.spi).toBe(0);
      expect(metrics.cpi).toBe(0);
      expect(metrics.completionRate).toBe(0);
    });
  });

  describe('健全性判定の境界値', () => {
    it('SPI=0.9, CPI=0.9 はhealthy', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 90,
        ac: 100,
        bac: 200,
      });

      expect(metrics.spi).toBeCloseTo(0.9, 2);
      expect(metrics.cpi).toBeCloseTo(0.9, 2);
      expect(metrics.healthStatus).toBe('healthy');
    });

    it('SPI=0.89はwarning（healthyの境界を下回る）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 89,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('warning');
    });

    it('SPI=0.8, CPI=0.8 はwarning', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('warning');
    });

    it('SPI=0.79はcritical（warningの境界を下回る）', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 79,
        ac: 100,
        bac: 200,
      });

      expect(metrics.healthStatus).toBe('critical');
    });

    it('CPI >= 0.9 でも SPI < 0.8 ならcritical', () => {
      const metrics = new EvmMetrics({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 70,
        ac: 70, // CPI = 1.0
        bac: 200,
      });

      expect(metrics.spi).toBeCloseTo(0.7, 2);
      expect(metrics.cpi).toBeCloseTo(1.0, 2);
      expect(metrics.healthStatus).toBe('critical');
    });
  });

  describe('EVM予測計算方式（forecastMethod）', () => {
    // 共通テストデータ: pv=100, ev=50, ac=60, bac=200
    // CPI = 50/60 = 0.8333...
    // SPI = 50/100 = 0.5
    const baseArgs = {
      date: new Date('2025-01-01'),
      pv_base: 100,
      pv: 100,
      ev: 50,
      ac: 60,
      bac: 200,
    };

    describe('CPI_ONLY（デフォルト）', () => {
      it('etc = (BAC - EV) / CPI', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_ONLY' });
        // ETC = (200 - 50) / (50/60) = 150 / 0.8333 = 180
        expect(metrics.etc).toBeCloseTo(180, 0);
        expect(metrics.forecastMethod).toBe('CPI_ONLY');
      });

      it('eac = AC + ETC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_ONLY' });
        // EAC = 60 + 180 = 240
        expect(metrics.eac).toBeCloseTo(240, 0);
      });

      it('vac = BAC - EAC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_ONLY' });
        // VAC = 200 - 240 = -40
        expect(metrics.vac).toBeCloseTo(-40, 0);
      });

      it('CPI=0の場合、etc=0を返す', () => {
        const metrics = EvmMetrics.create({
          ...baseArgs,
          ev: 0, ac: 0, // CPI = 0
          forecastMethod: 'CPI_ONLY',
        });
        expect(metrics.etc).toBe(0);
      });
    });

    describe('CPI_SPI', () => {
      it('etc = (BAC - EV) / (CPI × SPI)', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_SPI' });
        // CPI×SPI = (50/60) × (50/100) = 0.4167
        // ETC = (200 - 50) / 0.4167 = 360
        const cpiSpi = (50 / 60) * (50 / 100);
        expect(metrics.etc).toBeCloseTo(150 / cpiSpi, 0);
        expect(metrics.forecastMethod).toBe('CPI_SPI');
      });

      it('eac = AC + ETC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_SPI' });
        const cpiSpi = (50 / 60) * (50 / 100);
        const expectedEtc = 150 / cpiSpi;
        expect(metrics.eac).toBeCloseTo(60 + expectedEtc, 0);
      });

      it('vac = BAC - EAC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_SPI' });
        expect(metrics.vac).toBeCloseTo(200 - metrics.eac, 0);
      });

      it('CPI=0の場合、etc=0を返す', () => {
        const metrics = EvmMetrics.create({
          ...baseArgs,
          ev: 0, ac: 0, // CPI = 0
          forecastMethod: 'CPI_SPI',
        });
        expect(metrics.etc).toBe(0);
      });

      it('SPI=0の場合、etc=0を返す', () => {
        const metrics = EvmMetrics.create({
          ...baseArgs,
          pv: 0, // SPI = 0 (PV=0)
          forecastMethod: 'CPI_SPI',
        });
        expect(metrics.etc).toBe(0);
      });

      it('CPI×SPIが極小値の場合でも正常に計算する', () => {
        const metrics = EvmMetrics.create({
          ...baseArgs,
          pv: 1000, ev: 1, ac: 100, // CPI=0.01, SPI=0.001
          forecastMethod: 'CPI_SPI',
        });
        // CPI×SPI = 0.01 * 0.001 = 0.00001
        // ETC = (200 - 1) / 0.00001 = very large
        expect(metrics.etc).toBeGreaterThan(0);
        expect(Number.isFinite(metrics.etc)).toBe(true);
      });
    });

    describe('PLANNED', () => {
      it('etc = BAC - EV', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'PLANNED' });
        // ETC = 200 - 50 = 150
        expect(metrics.etc).toBe(150);
        expect(metrics.forecastMethod).toBe('PLANNED');
      });

      it('eac = AC + ETC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'PLANNED' });
        // EAC = 60 + 150 = 210
        expect(metrics.eac).toBe(210);
      });

      it('vac = BAC - EAC', () => {
        const metrics = EvmMetrics.create({ ...baseArgs, forecastMethod: 'PLANNED' });
        // VAC = 200 - 210 = -10
        expect(metrics.vac).toBe(-10);
      });

      it('CPI=0でも正常に計算する（CPIに依存しない）', () => {
        const metrics = EvmMetrics.create({
          ...baseArgs,
          ev: 0, ac: 0,
          forecastMethod: 'PLANNED',
        });
        // ETC = 200 - 0 = 200
        expect(metrics.etc).toBe(200);
        expect(metrics.eac).toBe(200); // AC(0) + ETC(200)
      });
    });

    describe('デフォルト動作', () => {
      it('forecastMethod未指定時はCPI_ONLYとして動作する', () => {
        const withDefault = EvmMetrics.create(baseArgs);
        const withExplicit = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_ONLY' });
        expect(withDefault.forecastMethod).toBe('CPI_ONLY');
        expect(withDefault.etc).toBeCloseTo(withExplicit.etc, 10);
        expect(withDefault.eac).toBeCloseTo(withExplicit.eac, 10);
        expect(withDefault.vac).toBeCloseTo(withExplicit.vac, 10);
      });
    });

    describe('方式間の比較', () => {
      it('遅延プロジェクト（SPI<1）ではCPI_SPI > CPI_ONLY > PLANNEDのETC順になる', () => {
        // SPI < 1 の場合、CPI_SPIが最も保守的（ETC大）
        const cpiOnly = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_ONLY' });
        const cpiSpi = EvmMetrics.create({ ...baseArgs, forecastMethod: 'CPI_SPI' });
        const planned = EvmMetrics.create({ ...baseArgs, forecastMethod: 'PLANNED' });

        expect(cpiSpi.etc).toBeGreaterThan(cpiOnly.etc);
        expect(cpiOnly.etc).toBeGreaterThan(planned.etc);
      });
    });
  });

  describe('ETCの下限クランプ（EV > BAC）', () => {
    // 予定工数が基準工数を超えて増えた場合など、EVがBACを上回ることがある。
    // 残作業は負にならないため、ETCは0を下限とする。
    const overEarnedArgs = {
      date: new Date('2025-01-01'),
      pv_base: 100,
      pv: 100,
      ev: 220,
      ac: 90,
      bac: 200,
    };

    it('CPI_ONLY: EV > BAC の場合、ETCは負値ではなく0を返す', () => {
      const metrics = EvmMetrics.create({ ...overEarnedArgs, forecastMethod: 'CPI_ONLY' });
      expect(metrics.etc).toBe(0);
      expect(metrics.eac).toBe(90); // EAC = AC + 0
    });

    it('CPI_SPI: EV > BAC の場合、ETCは負値ではなく0を返す', () => {
      const metrics = EvmMetrics.create({ ...overEarnedArgs, forecastMethod: 'CPI_SPI' });
      expect(metrics.etc).toBe(0);
      expect(metrics.eac).toBe(90);
    });

    it('PLANNED: EV > BAC の場合、ETCは負値ではなく0を返す', () => {
      const metrics = EvmMetrics.create({ ...overEarnedArgs, forecastMethod: 'PLANNED' });
      expect(metrics.etc).toBe(0);
      expect(metrics.eac).toBe(90);
    });

    it('VACはBAC - EACで整合する（EAC < BACとなりVACは正）', () => {
      const metrics = EvmMetrics.create({ ...overEarnedArgs, forecastMethod: 'CPI_ONLY' });
      expect(metrics.vac).toBe(200 - 90);
    });

    it('EV < BAC の通常ケースではクランプの影響を受けない', () => {
      const metrics = EvmMetrics.create({
        date: new Date('2025-01-01'),
        pv_base: 100,
        pv: 100,
        ev: 80,
        ac: 90,
        bac: 200,
        forecastMethod: 'CPI_ONLY',
      });
      // ETC = (200 - 80) / (80/90) = 135
      expect(metrics.etc).toBeCloseTo(135, 1);
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
