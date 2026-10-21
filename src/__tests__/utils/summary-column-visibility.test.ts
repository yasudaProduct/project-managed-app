import {
  SummaryColumnSettings,
  canEnableSummaryColumn,
  isSummaryColumnToggleDisabled,
  toggleSummaryColumn,
} from '@/utils/summary-column-visibility';

describe('summary-column-visibility', () => {
  const settings = (
    overrides: Partial<SummaryColumnSettings> = {}
  ): SummaryColumnSettings => ({
    showBaseline: false,
    showPlanned: true,
    showForecast: false,
    ...overrides,
  });

  describe('canEnableSummaryColumn', () => {
    it('他の2列が非表示の場合は表示にできる', () => {
      const current = settings({ showPlanned: false });
      expect(canEnableSummaryColumn(current, 'planned')).toBe(true);
      expect(canEnableSummaryColumn(current, 'baseline')).toBe(true);
      expect(canEnableSummaryColumn(current, 'forecast')).toBe(true);
    });

    it('他の1列のみ表示中の場合は表示にできる', () => {
      const current = settings({ showPlanned: true });
      expect(canEnableSummaryColumn(current, 'baseline')).toBe(true);
      expect(canEnableSummaryColumn(current, 'forecast')).toBe(true);
    });

    it('他の2列が表示中の場合は表示にできない（実績を含め4列すべて表示になるため）', () => {
      expect(
        canEnableSummaryColumn(
          settings({ showPlanned: true, showForecast: true }),
          'baseline'
        )
      ).toBe(false);
      expect(
        canEnableSummaryColumn(
          settings({ showBaseline: true, showForecast: true }),
          'planned'
        )
      ).toBe(false);
      expect(
        canEnableSummaryColumn(
          settings({ showBaseline: true, showPlanned: true }),
          'forecast'
        )
      ).toBe(false);
    });
  });

  describe('toggleSummaryColumn', () => {
    it('非表示への切り替えは常に反映される', () => {
      const current = settings({ showBaseline: true, showPlanned: true });
      expect(toggleSummaryColumn(current, 'planned', false)).toEqual(
        settings({ showBaseline: true, showPlanned: false })
      );
    });

    it('表示可能な場合は表示への切り替えが反映される', () => {
      const current = settings({ showPlanned: true });
      expect(toggleSummaryColumn(current, 'forecast', true)).toEqual(
        settings({ showPlanned: true, showForecast: true })
      );
    });

    it('4列すべて表示になる切り替えは無視される', () => {
      const current = settings({ showBaseline: true, showPlanned: true });
      expect(toggleSummaryColumn(current, 'forecast', true)).toEqual(current);
    });
  });

  describe('isSummaryColumnToggleDisabled', () => {
    it('表示中の列は常に切り替え可能', () => {
      const current = settings({ showBaseline: true, showPlanned: true });
      expect(isSummaryColumnToggleDisabled(current, 'baseline')).toBe(false);
      expect(isSummaryColumnToggleDisabled(current, 'planned')).toBe(false);
    });

    it('表示にできない非表示の列は切り替え不可', () => {
      const current = settings({ showBaseline: true, showPlanned: true });
      expect(isSummaryColumnToggleDisabled(current, 'forecast')).toBe(true);
    });
  });
});
