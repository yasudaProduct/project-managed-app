import { MonthlyAssigneeData, MonthlyAssigneeSummary, TaskAllocationDetail } from './wbs-summary-result';

/**
 * 月別・担当者別集計データの蓄積と集約を行うクラス
 * @description
 * 「月別・担当者別」の集計結果を段階的に貯めていく役割
 * 最後に累積された総計`MonthlyAssigneeSummary`を返す
 * アキュムレータ：繰り返し処理の中で結果を「累積」していく変数/オブジェクト。
 */
export class MonthlySummaryAccumulator {
  private dataMap = new Map<string, MonthlyAssigneeData>();
  private taskDetailsMap = new Map<string, TaskAllocationDetail[]>();
  private months = new Set<string>();
  private assignees = new Set<string>();

  /**
   * タスク配分結果を追加
   * @param assigneeName 担当者名
   * @param yearMonth 年月 (YYYY/MM)
   * @param plannedHours 予定工数
   * @param actualHours 実績工数
   * @param taskDetail タスク詳細
   */
  addTaskAllocation(
    assigneeName: string,
    yearMonth: string,
    plannedHours: number,
    actualHours: number,
    taskDetail: TaskAllocationDetail
  ): void {
    this.assignees.add(assigneeName);
    this.months.add(yearMonth);

    const key = `${yearMonth}-${assigneeName}`;
    const existing = this.dataMap.get(key) || {
      assignee: assigneeName,
      month: yearMonth,
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
      taskDetails: [],
    };

    existing.taskCount += 1;
    existing.plannedHours += plannedHours;
    existing.actualHours += actualHours;
    existing.difference = existing.actualHours - existing.plannedHours;

    this.dataMap.set(key, existing);

    // タスク詳細を追加
    if (!this.taskDetailsMap.has(key)) {
      this.taskDetailsMap.set(key, []);
    }
    this.taskDetailsMap.get(key)!.push(taskDetail);
  }

  /**
   * 集計結果を取得
   */
  getTotals(): MonthlyAssigneeSummary {
    const monthlyData: MonthlyAssigneeData[] = [];

    // monthlyDataにタスク詳細を含める
    for (const [key, data] of this.dataMap) {
      const taskDetails = this.taskDetailsMap.get(key) || [];
      monthlyData.push({
        ...data,
        taskDetails: taskDetails
      });
    }

    const sortedMonths = Array.from(this.months).sort();
    const sortedAssignees = Array.from(this.assignees).sort();

    return {
      data: monthlyData,
      months: sortedMonths,
      assignees: sortedAssignees,
      monthlyTotals: this.calculateMonthlyTotals(monthlyData, sortedMonths),
      assigneeTotals: this.calculateAssigneeTotals(monthlyData, sortedAssignees),
      grandTotal: this.calculateGrandTotal(monthlyData),
    };
  }

  /**
   * 月別合計を計算
   */
  private calculateMonthlyTotals(
    data: MonthlyAssigneeData[],
    months: string[]
  ): Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  }> {
    const monthlyTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};

    months.forEach(month => {
      monthlyTotals[month] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      data
        .filter(d => d.month === month)
        .forEach(d => {
          monthlyTotals[month].taskCount += d.taskCount;
          monthlyTotals[month].plannedHours += d.plannedHours;
          monthlyTotals[month].actualHours += d.actualHours;
          monthlyTotals[month].difference += d.difference;
        });
    });

    return monthlyTotals;
  }

  /**
   * 担当者別合計を計算
   */
  private calculateAssigneeTotals(
    data: MonthlyAssigneeData[],
    assignees: string[]
  ): Record<string, {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  }> {
    const assigneeTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
    }> = {};

    assignees.forEach(assignee => {
      assigneeTotals[assignee] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };

      data
        .filter(d => d.assignee === assignee)
        .forEach(d => {
          assigneeTotals[assignee].taskCount += d.taskCount;
          assigneeTotals[assignee].plannedHours += d.plannedHours;
          assigneeTotals[assignee].actualHours += d.actualHours;
          assigneeTotals[assignee].difference += d.difference;
        });
    });

    return assigneeTotals;
  }

  /**
   * 全体合計を計算
   */
  private calculateGrandTotal(
    data: MonthlyAssigneeData[]
  ): {
    taskCount: number;
    plannedHours: number;
    actualHours: number;
    difference: number;
  } {
    const grandTotal = {
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
    };

    data.forEach(d => {
      grandTotal.taskCount += d.taskCount;
      grandTotal.plannedHours += d.plannedHours;
      grandTotal.actualHours += d.actualHours;
      grandTotal.difference += d.difference;
    });

    return grandTotal;
  }
}
