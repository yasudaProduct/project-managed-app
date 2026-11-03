import { render, screen } from '@testing-library/react';
import MonthlySummaryTable, {
  SummaryCell,
} from '@/components/wbs/monthly-summary-table';

describe('MonthlySummaryTable - 列の表示切替', () => {
  const cell: SummaryCell = {
    plannedHours: 10,
    actualHours: 8,
    difference: -2,
    baselineHours: 12,
    forecastHours: 9,
  };

  const renderTable = (props: {
    showBaseline: boolean;
    showPlanned?: boolean;
    showForecast: boolean;
  }) =>
    render(
      <MonthlySummaryTable
        months={['2024-01']}
        rows={['田中']}
        firstColumnHeader="担当者"
        hoursUnit="hours"
        showDifference={false}
        getCell={() => cell}
        rowTotals={{ 田中: cell }}
        monthlyTotals={{ '2024-01': cell }}
        grandTotal={cell}
        {...props}
      />
    );

  it('予定列を表示する場合は予定列が描画される', () => {
    renderTable({ showBaseline: false, showPlanned: true, showForecast: false });

    expect(screen.getAllByText('予定(h)').length).toBeGreaterThan(0);
  });

  it('予定列を非表示にした場合は予定列が描画されない', () => {
    renderTable({
      showBaseline: true,
      showPlanned: false,
      showForecast: true,
    });

    expect(screen.queryByText('予定(h)')).not.toBeInTheDocument();
    expect(screen.getAllByText('基準(h)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('見通(h)').length).toBeGreaterThan(0);
  });

  it('showPlanned未指定の場合は予定列が描画される', () => {
    renderTable({ showBaseline: false, showForecast: false });

    expect(screen.getAllByText('予定(h)').length).toBeGreaterThan(0);
  });
});
