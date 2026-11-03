import {
  formatEvmValue,
  formatEvmCsvValue,
  evmIndexTextColorClass,
  evmIndexBarColorClass,
  DEFAULT_EVM_THRESHOLDS,
} from '@/utils/evm-format';

/**
 * EVM表示値フォーマットとしきい値色分けの共通ユーティリティ。
 *
 * 調査レポート（docs/reports/evm-operational-reliability-investigation.md）
 * UI-5・UI-9 への対応:
 * - UI-9: カード/チャート/時系列（丸めなし）と内訳/CSV（Math.round）で桁が
 *   食い違っていたため、金額は「円未満を四捨五入」に統一する。
 * - UI-5: SPI/CPIの色しきい値をプロジェクト設定値に連動させる
 *   （バッジは設定値・バーと内訳は1.0/0.9ハードコードで矛盾していた）。
 */
describe('formatEvmValue', () => {
  describe('工数モード（hours）', () => {
    it('小数第1位までのh表記にする', () => {
      expect(formatEvmValue(15.55, 'hours')).toBe('15.6h');
      expect(formatEvmValue(8, 'hours')).toBe('8.0h');
      expect(formatEvmValue(0, 'hours')).toBe('0.0h');
    });

    it('負値も符号付きで表示する（SV/CVのマイナス）', () => {
      expect(formatEvmValue(-3.25, 'hours')).toBe('-3.3h');
    });
  });

  describe('金額モード（cost）', () => {
    it('円未満を四捨五入して桁区切りする', () => {
      expect(formatEvmValue(1234.4, 'cost')).toBe('¥1,234');
      expect(formatEvmValue(1234.5, 'cost')).toBe('¥1,235');
      expect(formatEvmValue(1000000, 'cost')).toBe('¥1,000,000');
    });

    it('小数を持つ値でも小数点以下を表示しない（内訳表と桁が揃う）', () => {
      // 旧実装の `value.toLocaleString()` は "¥1,234.568" となり内訳表(¥1,235)と食い違っていた
      expect(formatEvmValue(1234.5678, 'cost')).toBe('¥1,235');
    });

    it('負値も符号付きで表示する', () => {
      expect(formatEvmValue(-200000, 'cost')).toBe('¥-200,000');
    });
  });
});

describe('formatEvmCsvValue', () => {
  it('工数モードは小数第1位・単位なし', () => {
    expect(formatEvmCsvValue(15.55, 'hours')).toBe('15.6');
  });

  it('金額モードは四捨五入した整数・記号なし', () => {
    expect(formatEvmCsvValue(1234.5678, 'cost')).toBe('1235');
  });

  it('画面表示（formatEvmValue）と同じ丸め結果になる', () => {
    const value = 1234.5678;
    expect(`¥${formatEvmCsvValue(value, 'cost')}`).toBe(
      formatEvmValue(value, 'cost').replace(/,/g, '')
    );
  });
});

describe('evmIndexTextColorClass', () => {
  const thresholds = { healthy: 0.9, warning: 0.8 };

  it('healthyしきい値以上は緑', () => {
    expect(evmIndexTextColorClass(1.2, thresholds)).toBe('text-green-600');
    expect(evmIndexTextColorClass(0.9, thresholds)).toBe('text-green-600');
  });

  it('warningしきい値以上healthy未満は黄', () => {
    expect(evmIndexTextColorClass(0.85, thresholds)).toBe('text-yellow-600');
    expect(evmIndexTextColorClass(0.8, thresholds)).toBe('text-yellow-600');
  });

  it('warningしきい値未満は赤', () => {
    expect(evmIndexTextColorClass(0.79, thresholds)).toBe('text-red-600');
  });

  it('nullはミュート表示', () => {
    expect(evmIndexTextColorClass(null, thresholds)).toBe(
      'text-muted-foreground'
    );
  });

  it('設定しきい値に連動する（既定90/80をプロジェクト設定95/90に変更した場合）', () => {
    const strict = { healthy: 0.95, warning: 0.9 };
    // 0.92 は既定なら緑だが、95%基準では黄になる
    expect(evmIndexTextColorClass(0.92, thresholds)).toBe('text-green-600');
    expect(evmIndexTextColorClass(0.92, strict)).toBe('text-yellow-600');
  });
});

describe('evmIndexBarColorClass', () => {
  const thresholds = { healthy: 0.9, warning: 0.8 };

  it('しきい値に応じてバー色を返す', () => {
    expect(evmIndexBarColorClass(1.0, thresholds)).toBe('bg-green-500');
    expect(evmIndexBarColorClass(0.85, thresholds)).toBe('bg-yellow-500');
    expect(evmIndexBarColorClass(0.5, thresholds)).toBe('bg-red-500');
  });

  it('バーとバッジ（ヘルス判定）が同じしきい値で切り替わる', () => {
    // ヘルス判定は EvmMetrics.healthStatus と同じ「>= healthy → healthy」
    const strict = { healthy: 0.95, warning: 0.9 };
    expect(evmIndexBarColorClass(0.94, strict)).toBe('bg-yellow-500');
    expect(evmIndexBarColorClass(0.95, strict)).toBe('bg-green-500');
  });
});

describe('DEFAULT_EVM_THRESHOLDS', () => {
  it('プロジェクト設定の既定値（90%/80%）と一致する', () => {
    expect(DEFAULT_EVM_THRESHOLDS).toEqual({ healthy: 0.9, warning: 0.8 });
  });
});
