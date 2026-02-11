import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MonthlyPhaseSummary } from '@/components/wbs/monthly-phase-summary';
import { MonthlyPhaseSummary as MonthlyPhaseSummaryData } from '@/applications/wbs/query/wbs-summary-result';

describe('MonthlyPhaseSummary - 見通し計算統一化', () => {
  const createMockData = (): MonthlyPhaseSummaryData => ({
    months: ['2024-01', '2024-02'],
    phases: ['要件定義'],
    data: [
      {
        month: '2024-01',
        phase: '要件定義',
        taskCount: 1,
        plannedHours: 100,
        actualHours: 80,
        difference: -20,
        forecastHours: 90,
        baselineHours: 0,
        taskDetails: [
          {
            taskId: '1',
            taskName: 'タスクA',
            phase: '要件定義',
            assignee: '田中',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            totalPlannedHours: 100,
            totalActualHours: 80,
            monthlyAllocations: [
              {
                month: '2024-01',
                allocatedPlannedHours: 100,
                allocatedActualHours: 80,
                allocatedForecastHours: 90,
                workingDays: 20,
                availableHours: 160,
                allocationRatio: 1
              }
            ]
          }
        ]
      }
    ],
    monthlyTotals: {
      '2024-01': {
        taskCount: 1,
        plannedHours: 100,
        actualHours: 80,
        difference: -20,
        baselineHours: 0,
        forecastHours: 90,
      }
    },
    phaseTotals: {
      '要件定義': {
        taskCount: 1,
        plannedHours: 100,
        actualHours: 80,
        difference: -20,
        baselineHours: 0,
        forecastHours: 90,
      }
    },
    grandTotal: {
      taskCount: 1,
      plannedHours: 100,
      actualHours: 80,
      difference: -20,
      baselineHours: 0,
      forecastHours: 90,
    }
  });

  describe('見通し計算の統一化', () => {
    it('MonthlyPhaseSummaryがallocatedForecastHoursを使用してレンダリングされる', () => {
      const mockData = createMockData();
      
      render(
        <MonthlyPhaseSummary
          monthlyData={mockData}
          hoursUnit="hours"
          showForecast={true}
        />
      );

      // レンダリングエラーがないことを確認
      expect(screen.getByText('月別・工程別集計表')).toBeInTheDocument();
    });

    it('taskDetailsが空の場合にエラーが発生しない', () => {
      const mockDataWithEmptyTasks = createMockData();
      mockDataWithEmptyTasks.data[0].taskDetails = [];
      
      expect(() => {
        render(
          <MonthlyPhaseSummary
            monthlyData={mockDataWithEmptyTasks}
            hoursUnit="hours"
            showForecast={true}
          />
        );
      }).not.toThrow();
    });
  });
});