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
  private assigneeSeqMap: Map<string, number>;

  constructor(assigneeSeqMap: Map<string, number> = new Map()) {
    this.assigneeSeqMap = assigneeSeqMap;
  }

  /**
   * タスク配分結果を追加
   * @param assigneeName 担当者名
   * @param yearMonth 年月 (YYYY/MM)
   * @param plannedHours 予定工数
   * @param actualHours 実績工数
   * @param baselineHours 基準工数
   * @param taskDetail タスク詳細
   * @param forecastHours 見通し工数（オプション）
   */
  addTaskAllocation(
    assigneeName: string,
    yearMonth: string,
    plannedHours: number,
    actualHours: number,
    baselineHours: number,
    taskDetail: TaskAllocationDetail,
    forecastHours?: number
  ): void {
    this.assignees.add(assigneeName);
    this.months.add(yearMonth);

    const key = `${yearMonth}-${assigneeName}`;
    const existing = this.dataMap.get(key) || {
      assignee: assigneeName,
      month: yearMonth,
      taskCount: 0,
      baselineHours: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
      forecastHours: 0,
      taskDetails: [],
    };

    existing.taskCount += 1;
    existing.baselineHours = (existing.baselineHours ?? 0) + baselineHours;
    existing.plannedHours += plannedHours;
    existing.actualHours += actualHours;
    existing.difference = existing.actualHours - existing.plannedHours;

    // 見通し工数を加算（指定された場合のみ）
    if (forecastHours !== undefined) {
      existing.forecastHours = (existing.forecastHours || 0) + forecastHours;
    }

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
    const sortedAssignees = Array.from(this.assignees)
      .map(name => ({ key: name, seq: this.assigneeSeqMap.get(name) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.seq - b.seq || a.key.localeCompare(b.key));
    const sortedAssigneeKeys = sortedAssignees.map(a => a.key);

    return {
      data: monthlyData,
      months: sortedMonths,
      assignees: sortedAssignees,
      monthlyTotals: this.calculateMonthlyTotals(monthlyData, sortedMonths),
      assigneeTotals: this.calculateAssigneeTotals(monthlyData, sortedAssigneeKeys),
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
    baselineHours: number;
    forecastHours: number;
  }> {
    const monthlyTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
      baselineHours: number;
      forecastHours: number;
    }> = {};

    months.forEach(month => {
      monthlyTotals[month] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
        baselineHours: 0,
        forecastHours: 0,
      };

      data
        .filter(d => d.month === month)
        .forEach(d => {
          monthlyTotals[month].taskCount += d.taskCount;
          monthlyTotals[month].plannedHours += d.plannedHours;
          monthlyTotals[month].actualHours += d.actualHours;
          monthlyTotals[month].difference += d.difference;
          if (d.baselineHours) {
            monthlyTotals[month].baselineHours = (monthlyTotals[month].baselineHours || 0) + d.baselineHours;
          }
          if (d.forecastHours) {
            monthlyTotals[month].forecastHours = (monthlyTotals[month].forecastHours || 0) + d.forecastHours;
          }
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
    baselineHours: number;
    forecastHours: number;
  }> {
    const assigneeTotals: Record<string, {
      taskCount: number;
      plannedHours: number;
      actualHours: number;
      difference: number;
      baselineHours: number;
      forecastHours: number;
    }> = {};

    assignees.forEach(assignee => {
      assigneeTotals[assignee] = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
        baselineHours: 0,
        forecastHours: 0,
      };

      data
        .filter(d => d.assignee === assignee)
        .forEach(d => {
          assigneeTotals[assignee].taskCount += d.taskCount;
          assigneeTotals[assignee].plannedHours += d.plannedHours;
          assigneeTotals[assignee].actualHours += d.actualHours;
          assigneeTotals[assignee].difference += d.difference;
          if (d.baselineHours) {
            assigneeTotals[assignee].baselineHours = (assigneeTotals[assignee].baselineHours || 0) + d.baselineHours;
          }
          if (d.forecastHours) {
            assigneeTotals[assignee].forecastHours = (assigneeTotals[assignee].forecastHours || 0) + d.forecastHours;
          }
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
    baselineHours: number;
    forecastHours: number;
  } {
    const grandTotal = {
      taskCount: 0,
      plannedHours: 0,
      actualHours: 0,
      difference: 0,
      baselineHours: 0,
      forecastHours: 0,
    };

    data.forEach(d => {
      grandTotal.taskCount += d.taskCount;
      grandTotal.plannedHours += d.plannedHours;
      grandTotal.actualHours += d.actualHours;
      grandTotal.difference += d.difference;
      if (d.baselineHours) {
        grandTotal.baselineHours = (grandTotal.baselineHours || 0) + d.baselineHours;
      }
      if (d.forecastHours) {
        grandTotal.forecastHours = (grandTotal.forecastHours || 0) + d.forecastHours;
      }
    });

    return grandTotal;
  }
}
