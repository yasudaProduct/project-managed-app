# EVM（Earned Value Management）表示機能 詳細設計書

## 段階的実装方針

この設計書は以下の3段階での実装を前提としています：

- **第1フェーズ**: 履歴なし実装（迅速な価値提供）
- **第2フェーズ**: 最小限履歴追加（正確な時系列分析）
- **第3フェーズ**: 高機能履歴（高度な分析・予測）

各実装例には対応フェーズを明記しています。

## 1. データモデル詳細

### 1.1 ドメインエンティティ

#### EvmMetrics エンティティ（第1フェーズ～）
```typescript
// src/domains/evm/entities/EvmMetrics.ts
export type EvmCalculationMode = 'hours' | 'cost';
export type ProgressMeasurementMethod = '0-100' | '50-50' | 'self-reported';

export class EvmMetrics {
  constructor(
    public readonly date: Date,
    public readonly pv: number,           // Planned Value
    public readonly ev: number,           // Earned Value
    public readonly ac: number,           // Actual Cost
    public readonly bac: number,          // Budget At Completion
    public readonly calculationMode: EvmCalculationMode = 'hours', // 算出方式
    public readonly progressMethod: ProgressMeasurementMethod = '50-50', // 進捗率測定方法
  ) {}

  // Schedule Variance
  get sv(): number {
    return this.ev - this.pv;
  }

  // Cost Variance
  get cv(): number {
    return this.ev - this.ac;
  }

  // Schedule Performance Index
  get spi(): number {
    return this.pv === 0 ? 0 : this.ev / this.pv;
  }

  // Cost Performance Index
  get cpi(): number {
    return this.ac === 0 ? 0 : this.ev / this.ac;
  }

  // Estimate To Complete
  get etc(): number {
    if (this.cpi === 0) return 0;
    return (this.bac - this.ev) / this.cpi;
  }

  // Estimate At Completion
  get eac(): number {
    return this.ac + this.etc;
  }

  // Variance At Completion
  get vac(): number {
    return this.bac - this.eac;
  }

  // 完了率
  get completionRate(): number {
    return this.bac === 0 ? 0 : (this.ev / this.bac) * 100;
  }

  // 表示用フォーマット（算出方式に応じて単位を変更）
  formatValue(value: number): string {
    if (this.calculationMode === 'cost') {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  }

  // 各指標の表示用フォーマット
  get formattedPv(): string { return this.formatValue(this.pv); }
  get formattedEv(): string { return this.formatValue(this.ev); }
  get formattedAc(): string { return this.formatValue(this.ac); }
  get formattedBac(): string { return this.formatValue(this.bac); }
  get formattedEac(): string { return this.formatValue(this.eac); }
  get formattedEtc(): string { return this.formatValue(this.etc); }
  get formattedSv(): string { return this.formatValue(this.sv); }
  get formattedCv(): string { return this.formatValue(this.cv); }
}
```

#### TaskEvmData エンティティ（第1フェーズ～）
```typescript
// src/domains/evm/entities/TaskEvmData.ts
export class TaskEvmData {
  constructor(
    public readonly taskId: number,
    public readonly taskNo: string,
    public readonly taskName: string,
    public readonly plannedStartDate: Date,
    public readonly plannedEndDate: Date,
    public readonly actualStartDate: Date | null,
    public readonly actualEndDate: Date | null,
    public readonly plannedManHours: number,
    public readonly actualManHours: number,
    public readonly status: TaskStatus,
    public readonly progressRate: number,
    public readonly hourlyRate: number = 0, // 金額ベース計算用（第2.5フェーズ）
    public readonly selfReportedProgress: number | null = null, // 自己申告進捗率（第2フェーズ）
  ) {}

  // 工数ベースの出来高計算
  get earnedValue(): number {
    return this.plannedManHours * (this.progressRate / 100);
  }

  // 金額ベースの出来高計算（第2.5フェーズ用）
  get earnedValueCost(): number {
    return this.plannedManHours * this.hourlyRate * (this.progressRate / 100);
  }

  // 進捗率測定方法に応じた進捗率取得
  getProgressRate(method: ProgressMeasurementMethod): number {
    switch (method) {
      case '0-100':
        return this.status === 'COMPLETED' ? 100 : 0;
      case '50-50':
        if (this.status === 'COMPLETED') return 100;
        if (this.status === 'IN_PROGRESS') return 50;
        return 0;
      case 'self-reported':
        return this.selfReportedProgress ?? this.progressRate;
      default:
        return this.progressRate;
    }
  }

  // 計算モードと進捗率測定方法に応じた出来高取得
  getEarnedValue(
    calculationMode: EvmCalculationMode,
    progressMethod: ProgressMeasurementMethod
  ): number {
    const progressRate = this.getProgressRate(progressMethod);

    if (calculationMode === 'cost') {
      return this.plannedManHours * this.hourlyRate * (progressRate / 100);
    } else {
      return this.plannedManHours * (progressRate / 100);
    }
  }

  getPlannedValueAtDate(evaluationDate: Date, mode: EvmCalculationMode = 'hours'): number {
    if (evaluationDate < this.plannedStartDate) return 0;

    const baseValue = mode === 'cost'
      ? this.plannedManHours * this.hourlyRate
      : this.plannedManHours;

    if (evaluationDate >= this.plannedEndDate) return baseValue;

    const totalDays = this.getDaysBetween(this.plannedStartDate, this.plannedEndDate);
    const elapsedDays = this.getDaysBetween(this.plannedStartDate, evaluationDate);

    return totalDays === 0 ? 0 : (baseValue * elapsedDays) / totalDays;
  }

  private getDaysBetween(start: Date, end: Date): number {
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
}
```

#### EvmSnapshot エンティティ（第2フェーズ～）
```typescript
// src/domains/evm/entities/EvmSnapshot.ts
export class EvmSnapshot {
  constructor(
    public readonly id: number,
    public readonly wbsId: number,
    public readonly snapshotDate: Date,
    public readonly pv: number,
    public readonly ev: number,
    public readonly ac: number,
    public readonly bac: number,
    public readonly calculationMode: EvmCalculationMode,
    public readonly progressMethod: ProgressMeasurementMethod,
    public readonly createdAt: Date,
  ) {}

  toEvmMetrics(): EvmMetrics {
    return new EvmMetrics(
      this.snapshotDate,
      this.pv,
      this.ev,
      this.ac,
      this.bac,
      this.calculationMode,
      this.progressMethod
    );
  }
}
```

#### ProgressForecast エンティティ（第3フェーズ）
```typescript
// src/domains/evm/entities/ProgressForecast.ts
export class ProgressForecast {
  constructor(
    public readonly forecastDate: Date,
    public readonly predictedCompletionDate: Date,
    public readonly predictedTotalCost: number,
    public readonly confidenceLevel: number,
    public readonly forecastMethod: string,
  ) {}
}
```

### 1.2 データ取得インターフェース

#### IEvmRepository インターフェース（第1フェーズ）
```typescript
// src/applications/evm/IEvmRepository.ts
export interface IEvmRepository {
  // WBS全体のEVMデータを取得
  getWbsEvmData(wbsId: number, evaluationDate: Date): Promise<WbsEvmData>;

  // タスクごとのEVMデータを取得
  getTasksEvmData(wbsId: number): Promise<TaskEvmData[]>;

  // 期間指定でのEVM履歴データを取得（第1フェーズは推測計算）
  getEvmHistory(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Promise<EvmMetrics[]>;

  // 実績コストの集計（算出方式に応じて工数または金額）
  getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode?: EvmCalculationMode
  ): Promise<Map<string, number>>;
}

export interface WbsEvmData {
  wbsId: number;
  projectName: string;
  totalPlannedManHours: number;
  tasks: TaskEvmData[];
  buffers: BufferData[];
}

export interface BufferData {
  id: number;
  name: string;
  bufferHours: number;
  bufferType: string;
}
```

#### IEvmHistoryRepository インターフェース（第2フェーズ～）
```typescript
// src/applications/evm/IEvmHistoryRepository.ts
export interface IEvmHistoryRepository {
  // スナップショットの保存
  saveSnapshot(
    wbsId: number,
    metrics: EvmMetrics,
    snapshotDate: Date
  ): Promise<void>;

  // スナップショットの取得
  getSnapshot(wbsId: number, date: Date): Promise<EvmSnapshot | null>;

  // 期間指定でのスナップショット取得
  getSnapshotsInRange(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<EvmSnapshot[]>;

  // タスクステータス変更の記録
  recordTaskStatusChange(
    taskId: number,
    oldStatus: TaskStatus,
    newStatus: TaskStatus,
    changedBy?: string
  ): Promise<void>;

  // 期間指定でのタスクステータス履歴取得
  getTaskStatusHistory(
    taskId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TaskStatusChange[]>;
}

export interface TaskStatusChange {
  taskId: number;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  changedAt: Date;
  changedBy?: string;
}
```

#### IEvmAnalyticsRepository インターフェース（第3フェーズ）
```typescript
// src/applications/evm/IEvmAnalyticsRepository.ts
export interface IEvmAnalyticsRepository {
  // 予測履歴の保存
  saveForecast(
    wbsProgressHistoryId: number,
    forecast: ProgressForecast
  ): Promise<void>;

  // トレンド分析データの取得
  getTrendData(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]>;

  // 予測精度の分析
  analyzeForecastAccuracy(
    wbsId: number,
    forecastDate: Date
  ): Promise<ForecastAccuracy>;
}
```

## 2. サービス層実装

### 2.1 EVM計算サービス（第1フェーズ）
```typescript
// src/applications/evm/EvmService.ts
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { IEvmRepository } from './IEvmRepository';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';
import { TaskEvmData } from '@/domains/evm/entities/TaskEvmData';

@injectable()
export class EvmService {
  constructor(
    @inject(TYPES.IEvmRepository)
    private evmRepository: IEvmRepository
  ) {}

  async calculateCurrentEvmMetrics(
    wbsId: number,
    evaluationDate: Date = new Date(),
    calculationMode: EvmCalculationMode = 'hours', // 算出方式を指定
    progressMethod: ProgressMeasurementMethod = '50-50' // 進捗率測定方法を指定
  ): Promise<EvmMetrics> {
    const wbsData = await this.evmRepository.getWbsEvmData(wbsId, evaluationDate);

    // PV計算: 評価日までの計画値
    const pv = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getPlannedValueAtDate(evaluationDate, calculationMode);
    }, 0);

    // EV計算: 完了した作業の出来高
    const ev = wbsData.tasks.reduce((sum, task) => {
      return sum + task.getEarnedValue(calculationMode, progressMethod);
    }, 0);

    // AC計算: 実際の投入コスト
    const actualCostMap = await this.evmRepository.getActualCostByDate(
      wbsId,
      wbsData.tasks[0]?.plannedStartDate || new Date(),
      evaluationDate,
      calculationMode
    );

    const ac = Array.from(actualCostMap.values()).reduce((sum, cost) => sum + cost, 0);

    // BAC計算: 完了時の予算
    const bac = calculationMode === 'cost'
      ? wbsData.tasks.reduce((sum, task) =>
          sum + task.plannedManHours * task.hourlyRate, 0) +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0)
      : wbsData.totalPlannedManHours +
        wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

    return new EvmMetrics(evaluationDate, pv, ev, ac, bac, calculationMode, progressMethod);
  }

  async getEvmTimeSeries(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<EvmMetrics[]> {
    // 第1フェーズ：推測ベースの履歴計算
    // 第2フェーズ以降：スナップショットデータと推測の併用
    return this.evmRepository.getEvmHistory(wbsId, startDate, endDate, interval);
  }

  async getTaskEvmDetails(wbsId: number): Promise<TaskEvmData[]> {
    return this.evmRepository.getTasksEvmData(wbsId);
  }

  // ヘルスステータス判定
  getHealthStatus(metrics: EvmMetrics): 'good' | 'warning' | 'danger' {
    const spiThreshold = { danger: 0.8, warning: 0.9 };
    const cpiThreshold = { danger: 0.8, warning: 0.9 };

    if (metrics.spi < spiThreshold.danger || metrics.cpi < cpiThreshold.danger) {
      return 'danger';
    }
    if (metrics.spi < spiThreshold.warning || metrics.cpi < cpiThreshold.warning) {
      return 'warning';
    }
    return 'good';
  }
}
```

### 2.2 EVM履歴サービス（第2フェーズ～）
```typescript
// src/applications/evm/EvmHistoryService.ts
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { IEvmHistoryRepository } from './IEvmHistoryRepository';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';

@injectable()
export class EvmHistoryService {
  constructor(
    @inject(TYPES.IEvmHistoryRepository)
    private historyRepository: IEvmHistoryRepository,
    @inject(TYPES.EvmService)
    private evmService: EvmService
  ) {}

  // 自動スナップショット保存（日次実行）
  async saveAutoSnapshot(wbsId: number, date: Date = new Date()): Promise<void> {
    const metrics = await this.evmService.calculateCurrentEvmMetrics(wbsId, date);
    await this.historyRepository.saveSnapshot(wbsId, metrics, date);
  }

  // ハイブリッド履歴取得（スナップショット + 推測）
  async getHybridEvmHistory(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<EvmMetrics[]> {
    const snapshots = await this.historyRepository.getSnapshotsInRange(
      wbsId,
      startDate,
      endDate
    );

    const dates = this.generateDateRange(startDate, endDate, interval);
    const results: EvmMetrics[] = [];

    for (const date of dates) {
      // スナップショットがあれば使用、なければ推測計算
      const snapshot = snapshots.find(s =>
        s.snapshotDate.toDateString() === date.toDateString()
      );

      if (snapshot) {
        results.push(snapshot.toEvmMetrics());
      } else {
        // 推測計算にフォールバック
        const estimatedMetrics = await this.evmService.calculateCurrentEvmMetrics(
          wbsId,
          date
        );
        results.push(estimatedMetrics);
      }
    }

    return results;
  }

  private generateDateRange(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Date[] {
    // 実装省略（基本設計書と同様）
    return [];
  }
}
```

## 3. リポジトリ層実装

### 3.1 基本リポジトリ実装（第1フェーズ）
```typescript
// src/infrastructures/evm/EvmRepository.ts
import { injectable } from 'inversify';
import { prisma } from '@/lib/prisma';
import { IEvmRepository, WbsEvmData, BufferData } from '@/applications/evm/IEvmRepository';
import { TaskEvmData } from '@/domains/evm/entities/TaskEvmData';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';
import { TaskStatus } from '@prisma/client';

@injectable()
export class EvmRepository implements IEvmRepository {
  async getWbsEvmData(wbsId: number, evaluationDate: Date): Promise<WbsEvmData> {
    const wbs = await prisma.wbs.findUnique({
      where: { id: wbsId },
      include: {
        project: true,
        tasks: {
          include: {
            periods: true,
            statusLogs: {
              orderBy: { changedAt: 'desc' },
              take: 1,
            },
            workRecords: true,
            assignee: true,
          },
        },
        buffers: true,
        kosus: {
          include: {
            period: true,
          },
        },
      },
    });

    if (!wbs) {
      throw new Error(`WBS not found: ${wbsId}`);
    }

    const tasks = wbs.tasks.map(task => {
      const plannedPeriod = task.periods.find(p => p.type === 'PLANNED');
      const actualPeriod = task.periods.find(p => p.type === 'ACTUAL');

      // 工数の計算
      const plannedManHours = this.calculatePlannedManHours(task, wbs.kosus);
      const actualManHours = task.workRecords.reduce((sum, wr) =>
        sum + Number(wr.hours_worked), 0
      );

      // 進捗率の計算
      const progressRate = this.calculateProgressRate(task.status);

      return new TaskEvmData(
        task.id,
        task.taskNo,
        task.name,
        plannedPeriod?.startDate || new Date(),
        plannedPeriod?.endDate || new Date(),
        actualPeriod?.startDate || null,
        actualPeriod?.endDate || null,
        plannedManHours,
        actualManHours,
        task.status,
        progressRate,
        task.assignee?.hourlyRate || 0, // 第2.5フェーズで実装
        task.progressRate || null // 自己申告進捗率（第2フェーズで実装）
      );
    });

    const buffers: BufferData[] = wbs.buffers.map(buffer => ({
      id: buffer.id,
      name: buffer.name,
      bufferHours: buffer.buffer,
      bufferType: buffer.bufferType,
    }));

    const totalPlannedManHours = tasks.reduce((sum, task) =>
      sum + task.plannedManHours, 0
    );

    return {
      wbsId: wbs.id,
      projectName: wbs.project.name,
      totalPlannedManHours,
      tasks,
      buffers,
    };
  }

  async getTasksEvmData(wbsId: number): Promise<TaskEvmData[]> {
    const wbsData = await this.getWbsEvmData(wbsId, new Date());
    return wbsData.tasks;
  }

  async getEvmHistory(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Promise<EvmMetrics[]> {
    const dates = this.generateDateRange(startDate, endDate, interval);
    const metrics: EvmMetrics[] = [];

    for (const date of dates) {
      const wbsData = await this.getWbsEvmData(wbsId, date);

      // 各日付でのPV, EV, AC計算
      const pv = wbsData.tasks.reduce((sum, task) =>
        sum + task.getPlannedValueAtDate(date), 0
      );

      const ev = await this.calculateEarnedValueAtDate(wbsId, date);
      const ac = await this.calculateActualCostAtDate(wbsId, date);
      const bac = wbsData.totalPlannedManHours +
                  wbsData.buffers.reduce((sum, b) => sum + b.bufferHours, 0);

      metrics.push(new EvmMetrics(date, pv, ev, ac, bac));
    }

    return metrics;
  }

  async getActualCostByDate(
    wbsId: number,
    startDate: Date,
    endDate: Date,
    calculationMode: EvmCalculationMode = 'hours'
  ): Promise<Map<string, number>> {
    const workRecords = await prisma.workRecord.findMany({
      where: {
        task: {
          wbsId: wbsId,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        task: {
          include: {
            assignee: true, // 金額計算用の担当者情報
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const costMap = new Map<string, number>();

    workRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const currentCost = costMap.get(dateKey) || 0;

      // 計算モードに応じて工数または金額を加算
      const cost = calculationMode === 'cost'
        ? Number(record.hours_worked) * (record.task.assignee?.hourlyRate || 0) // 第2.5フェーズで実装
        : Number(record.hours_worked);

      costMap.set(dateKey, currentCost + cost);
    });

    return costMap;
  }

  private calculatePlannedManHours(task: any, kosus: any[]): number {
    const taskKosus = kosus.filter(k =>
      k.period.taskId === task.id && k.type === 'PLANNED'
    );
    return taskKosus.reduce((sum, k) => sum + Number(k.kosu), 0);
  }

  private calculateProgressRate(status: TaskStatus): number {
    switch (status) {
      case 'NOT_STARTED': return 0;
      case 'IN_PROGRESS': return 50;  // 実際の進捗率を別途管理する場合は要調整
      case 'COMPLETED': return 100;
      case 'ON_HOLD': return 0;
      case 'CANCELLED': return 0;
      default: return 0;
    }
  }

  private async calculateEarnedValueAtDate(wbsId: number, date: Date): Promise<number> {
    // 指定日までのタスク完了状況から出来高を計算
    const statusLogs = await prisma.taskStatusLog.findMany({
      where: {
        task: { wbsId },
        changedAt: { lte: date },
      },
      include: {
        task: {
          include: {
            periods: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    // 各タスクの最新ステータスを取得し、EVを計算
    const taskStatusMap = new Map<number, TaskStatus>();
    statusLogs.forEach(log => {
      if (!taskStatusMap.has(log.taskId)) {
        taskStatusMap.set(log.taskId, log.status);
      }
    });

    let ev = 0;
    const tasks = await prisma.wbsTask.findMany({
      where: { wbsId },
      include: { periods: true },
    });

    for (const task of tasks) {
      const status = taskStatusMap.get(task.id) || task.status;
      const progressRate = this.calculateProgressRate(status);
      const plannedManHours = await this.getTaskPlannedManHours(task.id);
      ev += plannedManHours * (progressRate / 100);
    }

    return ev;
  }

  private async calculateActualCostAtDate(wbsId: number, date: Date): Promise<number> {
    const workRecords = await prisma.workRecord.findMany({
      where: {
        task: { wbsId },
        date: { lte: date },
      },
    });

    return workRecords.reduce((sum, record) =>
      sum + Number(record.hours_worked), 0
    );
  }

  private async getTaskPlannedManHours(taskId: number): Promise<number> {
    const kosus = await prisma.taskKosu.findMany({
      where: {
        period: { taskId },
        type: 'PLANNED',
      },
    });

    return kosus.reduce((sum, k) => sum + Number(k.kosu), 0);
  }

  private generateDateRange(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch (interval) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }
}
```

### 3.2 履歴リポジトリ実装（第2フェーズ～）
```typescript
// src/infrastructures/evm/EvmHistoryRepository.ts
import { injectable } from 'inversify';
import { prisma } from '@/lib/prisma';
import { IEvmHistoryRepository, TaskStatusChange } from '@/applications/evm/IEvmHistoryRepository';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';
import { EvmSnapshot } from '@/domains/evm/entities/EvmSnapshot';

@injectable()
export class EvmHistoryRepository implements IEvmHistoryRepository {
  async saveSnapshot(
    wbsId: number,
    metrics: EvmMetrics,
    snapshotDate: Date
  ): Promise<void> {
    await prisma.evmSnapshot.upsert({
      where: {
        unique_snapshot: { wbs_id: wbsId, snapshot_date: snapshotDate },
      },
      update: {
        pv: metrics.pv,
        ev: metrics.ev,
        ac: metrics.ac,
        bac: metrics.bac,
      },
      create: {
        wbs_id: wbsId,
        snapshot_date: snapshotDate,
        pv: metrics.pv,
        ev: metrics.ev,
        ac: metrics.ac,
        bac: metrics.bac,
      },
    });
  }

  // 他のメソッド実装は省略...
}
```

## 4. Server Actions実装

### 4.1 基本Server Actions（第1フェーズ）
```typescript
// src/app/actions/evm/evm-actions.ts
'use server';

import { container } from '@/lib/inversify.config';
import { EvmService } from '@/applications/evm/EvmService';
import { TYPES } from '@/lib/types';
import { EvmCalculationMode, ProgressMeasurementMethod } from '@/domains/evm/entities/EvmMetrics';

// 現在のEVM指標を取得
export async function getCurrentEvmMetrics(
  wbsId: number,
  evaluationDate: Date = new Date(),
  calculationMode: EvmCalculationMode = 'hours',
  progressMethod: ProgressMeasurementMethod = '50-50'
) {
  try {
    const evmService = container.get<EvmService>(TYPES.EvmService);

    const metrics = await evmService.calculateCurrentEvmMetrics(
      wbsId,
      evaluationDate,
      calculationMode,
      progressMethod
    );

    return { success: true, data: metrics };
  } catch (error) {
    console.error('EVM calculation error:', error);
    return { success: false, error: 'Failed to calculate EVM metrics' };
  }
}

// EVM時系列データを取得
export async function getEvmTimeSeries(
  wbsId: number,
  startDate: Date,
  endDate: Date,
  interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
) {
  try {
    const evmService = container.get<EvmService>(TYPES.EvmService);

    const timeSeries = await evmService.getEvmTimeSeries(
      wbsId,
      startDate,
      endDate,
      interval
    );

    return { success: true, data: timeSeries };
  } catch (error) {
    console.error('EVM time series error:', error);
    return { success: false, error: 'Failed to get EVM time series' };
  }
}

// タスク別EVM詳細を取得
export async function getTaskEvmDetails(wbsId: number) {
  try {
    const evmService = container.get<EvmService>(TYPES.EvmService);

    const taskDetails = await evmService.getTaskEvmDetails(wbsId);

    return { success: true, data: taskDetails };
  } catch (error) {
    console.error('Task EVM details error:', error);
    return { success: false, error: 'Failed to get task EVM details' };
  }
}
```

### 4.2 履歴Server Actions（第2フェーズ～）
```typescript
// src/app/actions/evm/evm-history-actions.ts
'use server';

import { container } from '@/lib/inversify.config';
import { EvmHistoryService } from '@/applications/evm/EvmHistoryService';
import { TYPES } from '@/lib/types';

// 手動スナップショット保存
export async function saveManualSnapshot(
  wbsId: number,
  snapshotName: string,
  date: Date = new Date()
) {
  try {
    const historyService = container.get<EvmHistoryService>(TYPES.EvmHistoryService);

    await historyService.saveManualSnapshot(wbsId, snapshotName, date);

    return { success: true, message: 'Snapshot saved successfully' };
  } catch (error) {
    console.error('Manual snapshot save error:', error);
    return { success: false, error: 'Failed to save snapshot' };
  }
}

// ハイブリッド履歴データ取得
export async function getEvmHistoryData(
  wbsId: number,
  startDate: Date,
  endDate: Date,
  interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
) {
  try {
    const historyService = container.get<EvmHistoryService>(TYPES.EvmHistoryService);

    const historyData = await historyService.getHybridEvmHistory(
      wbsId,
      startDate,
      endDate,
      interval
    );

    return { success: true, data: historyData };
  } catch (error) {
    console.error('EVM history data error:', error);
    return { success: false, error: 'Failed to get EVM history data' };
  }
}
```

### 4.3 自動スナップショット用APIエンドポイント（第2フェーズ～）
```typescript
// src/app/api/evm/snapshots/route.ts
// cron実行専用のAPIエンドポイント
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { EvmHistoryService } from '@/applications/evm/EvmHistoryService';
import { TYPES } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // cron実行用の認証チェック（例：API キー）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wbsId, date } = await request.json();
    const historyService = container.get<EvmHistoryService>(TYPES.EvmHistoryService);

    await historyService.saveAutoSnapshot(wbsId, date ? new Date(date) : new Date());

    return NextResponse.json({ success: true, message: 'Auto snapshot saved' });
  } catch (error) {
    console.error('Auto snapshot save error:', error);
    return NextResponse.json(
      { error: 'Failed to save auto snapshot' },
      { status: 500 }
    );
  }
}
```

### 4.4 自動スナップショット機能（第2フェーズ～）
```typescript
// src/lib/cron/evm-snapshot.ts
import cron from 'node-cron';
import { prisma } from '@/lib/prisma';

// 毎日午前2時に実行
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily EVM snapshot...');

  try {
    // アクティブなWBSを取得
    const activeWbsList = await prisma.wbs.findMany({
      include: {
        project: true,
      },
      where: {
        project: {
          status: 'ACTIVE',
        },
      },
    });

    // 各WBSのスナップショットをAPIエンドポイント経由で保存
    for (const wbs of activeWbsList) {
      const response = await fetch(`${process.env.BASE_URL}/api/evm/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_API_KEY}`,
        },
        body: JSON.stringify({
          wbsId: wbs.id,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error(`Failed to save snapshot for WBS ${wbs.id}:`, await response.text());
      }
    }

    console.log(`EVM snapshots processed for ${activeWbsList.length} projects`);
  } catch (error) {
    console.error('Failed to save EVM snapshots:', error);
  }
});

// 環境変数の設定例
// .env.local
// BASE_URL=http://localhost:3000
// CRON_API_KEY=your-secure-api-key-here
```

## 5. UIコンポーネント実装

### 5.1 EVMチャートコンポーネント（第1フェーズ～）
```typescript
// src/components/evm/EvmChart.tsx
'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';

interface EvmChartProps {
  data: EvmMetrics[];
  title?: string;
}

export function EvmChart({ data, title = 'EVM推移チャート' }: EvmChartProps) {
  const chartData = data.map(metric => ({
    date: metric.date.toLocaleDateString('ja-JP'),
    PV: metric.pv.toFixed(1),
    EV: metric.ev.toFixed(1),
    AC: metric.ac.toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: '工数（時間）', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="PV"
              stroke="#8884d8"
              name="計画価値(PV)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="EV"
              stroke="#82ca9d"
              name="出来高(EV)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="AC"
              stroke="#ff7c7c"
              name="実コスト(AC)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 5.2 EVMダッシュボードコンポーネント（第1フェーズ～）
```typescript
// src/components/evm/EvmDashboard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EvmMetrics } from '@/domains/evm/entities/EvmMetrics';

interface EvmDashboardProps {
  metrics: EvmMetrics;
  healthStatus: 'good' | 'warning' | 'danger';
}

export function EvmDashboard({ metrics, healthStatus }: EvmDashboardProps) {
  const getStatusColor = (value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'text-green-600';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatHours = (value: number) => `${value.toFixed(1)}h`;

  const indicatorCards = [
    {
      title: 'SPI (スケジュール効率)',
      value: metrics.spi,
      format: (v: number) => v.toFixed(2),
      threshold: { good: 0.95, warning: 0.9 },
      description: 'スケジュール遵守率',
    },
    {
      title: 'CPI (コスト効率)',
      value: metrics.cpi,
      format: (v: number) => v.toFixed(2),
      threshold: { good: 0.95, warning: 0.9 },
      description: 'コスト効率',
    },
    {
      title: 'SV (スケジュール差異)',
      value: metrics.sv,
      format: formatHours,
      threshold: { good: 0, warning: -10 },
      description: '計画との差異',
    },
    {
      title: 'CV (コスト差異)',
      value: metrics.cv,
      format: formatHours,
      threshold: { good: 0, warning: -10 },
      description: 'コストとの差異',
    },
    {
      title: '完了率',
      value: metrics.completionRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      threshold: { good: 80, warning: 60 },
      description: 'プロジェクト進捗',
    },
    {
      title: 'EAC (完了時総工数)',
      value: metrics.eac,
      format: formatHours,
      threshold: { good: metrics.bac * 1.05, warning: metrics.bac * 1.1 },
      description: '予測総工数',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {indicatorCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getStatusColor(card.value, card.threshold)}`}>
                {card.format(card.value)}
              </span>
              {getTrendIcon(card.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* 全体ステータス */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>プロジェクトヘルスステータス</CardTitle>
            <Badge
              variant={
                healthStatus === 'good' ? 'default' :
                healthStatus === 'warning' ? 'secondary' :
                'destructive'
              }
            >
              {healthStatus === 'good' ? '正常' :
               healthStatus === 'warning' ? '注意' : '危険'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">計画価値 (PV)</span>
              <span className="text-sm font-medium">{formatHours(metrics.pv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">出来高 (EV)</span>
              <span className="text-sm font-medium">{formatHours(metrics.ev)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">実コスト (AC)</span>
              <span className="text-sm font-medium">{formatHours(metrics.ac)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">完了時予算 (BAC)</span>
              <span className="text-sm font-medium">{formatHours(metrics.bac)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5.3 タブコンテンツ統合コンポーネント（第1フェーズ～）
```typescript
// src/components/evm/EvmTabContent.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentEvmMetrics, getEvmTimeSeries, getTaskEvmDetails } from '@/app/actions/evm/evm-actions';
import { EvmChart } from './EvmChart';
import { EvmDashboard } from './EvmDashboard';
import { EvmTable } from './EvmTable';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EvmTabContentProps {
  wbsId: number;
  projectStartDate: Date;
  projectEndDate: Date;
}

export function EvmTabContent({
  wbsId,
  projectStartDate,
  projectEndDate
}: EvmTabContentProps) {
  const [dateRange, setDateRange] = useState({
    from: projectStartDate,
    to: new Date(),
  });
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [calculationMode, setCalculationMode] = useState<EvmCalculationMode>('hours'); // 算出方式の状態
  const [progressMethod, setProgressMethod] = useState<ProgressMeasurementMethod>('50-50'); // 進捗率測定方法の状態

  // 現在のEVM指標を取得
  const { data: currentMetrics, isLoading: isLoadingCurrent, refetch: refetchCurrent } = useQuery({
    queryKey: ['evm', wbsId, 'current', calculationMode, progressMethod],
    queryFn: async () => {
      const result = await getCurrentEvmMetrics(
        wbsId,
        new Date(),
        calculationMode,
        progressMethod
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  // 時系列データを取得
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['evm', wbsId, 'history', dateRange, interval, calculationMode, progressMethod],
    queryFn: async () => {
      const result = await getEvmTimeSeries(
        wbsId,
        dateRange.from,
        dateRange.to,
        interval
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  // タスク詳細データを取得
  const { data: taskData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['evm', wbsId, 'tasks'],
    queryFn: async () => {
      const result = await getTaskEvmDetails(wbsId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const handleExport = () => {
    // CSV/Excelエクスポート機能の実装
    console.log('Export EVM data');
  };

  const handleRefresh = () => {
    refetchCurrent();
    refetchHistory();
  };

  if (isLoadingCurrent || isLoadingHistory || isLoadingTasks) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const healthStatus = currentMetrics ? getHealthStatus(currentMetrics) : 'warning';

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-4">
        <DatePickerWithRange
          value={dateRange}
          onChange={setDateRange}
        />
        <Select value={interval} onValueChange={(v) => setInterval(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">日次</SelectItem>
            <SelectItem value="weekly">週次</SelectItem>
            <SelectItem value="monthly">月次</SelectItem>
          </SelectContent>
        </Select>
        {/* 算出方式切り替え（第2フェーズで有効化） */}
        <Select
          value={calculationMode}
          onValueChange={(v) => setCalculationMode(v as EvmCalculationMode)}
          disabled={true} // 第1フェーズでは工数ベースのみ
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours">工数ベース</SelectItem>
            <SelectItem value="cost">金額ベース</SelectItem>
          </SelectContent>
        </Select>
        {/* 進捗率測定方法切り替え */}
        <Select
          value={progressMethod}
          onValueChange={(v) => setProgressMethod(v as ProgressMeasurementMethod)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0-100">0/100法</SelectItem>
            <SelectItem value="50-50">50/50法</SelectItem>
            <SelectItem value="self-reported" disabled={true}>自己申告</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* ダッシュボード */}
      {currentMetrics && (
        <EvmDashboard
          metrics={currentMetrics}
          healthStatus={healthStatus}
        />
      )}

      {/* チャート */}
      {historyData && (
        <EvmChart
          data={historyData}
          title="EVM推移チャート"
        />
      )}

      {/* 詳細テーブル */}
      {taskData && (
        <EvmTable
          tasks={taskData}
          title="タスク別EVM詳細"
        />
      )}
    </div>
  );
}

function getHealthStatus(metrics: any): 'good' | 'warning' | 'danger' {
  if (metrics.spi < 0.8 || metrics.cpi < 0.8) return 'danger';
  if (metrics.spi < 0.9 || metrics.cpi < 0.9) return 'warning';
  return 'good';
}
```

## 6. 依存性注入設定

### 6.1 第1フェーズ設定
```typescript
// src/lib/inversify.config.ts 追加分
import { IEvmRepository } from '@/applications/evm/IEvmRepository';
import { EvmRepository } from '@/infrastructures/evm/EvmRepository';
import { EvmService } from '@/applications/evm/EvmService';

// TYPESに追加
export const TYPES = {
  // ... 既存のタイプ
  IEvmRepository: Symbol.for('IEvmRepository'),
  EvmService: Symbol.for('EvmService'),
};

// バインディング追加
container.bind<IEvmRepository>(TYPES.IEvmRepository).to(EvmRepository);
container.bind<EvmService>(TYPES.EvmService).to(EvmService);
```

### 6.2 第2フェーズ追加設定
```typescript
// 履歴機能用のバインディング追加
import { IEvmHistoryRepository } from '@/applications/evm/IEvmHistoryRepository';
import { EvmHistoryRepository } from '@/infrastructures/evm/EvmHistoryRepository';
import { EvmHistoryService } from '@/applications/evm/EvmHistoryService';

// TYPESに追加
export const TYPES = {
  // ... 既存のタイプ
  IEvmHistoryRepository: Symbol.for('IEvmHistoryRepository'),
  EvmHistoryService: Symbol.for('EvmHistoryService'),
};

// バインディング追加
container.bind<IEvmHistoryRepository>(TYPES.IEvmHistoryRepository).to(EvmHistoryRepository);
container.bind<EvmHistoryService>(TYPES.EvmHistoryService).to(EvmHistoryService);
```

## 7. プロジェクト詳細ページへの統合

### 7.1 タブへのEVM追加
```typescript
// src/app/projects/[id]/page.tsxの修正箇所

// インポートに追加
import { TrendingUp } from 'lucide-react';
import { EvmTabContent } from '@/components/evm/EvmTabContent';

// タブリストに追加（line 236付近、tableタブの後）
<TabsTrigger value="evm" className="flex items-center gap-2">
  <TrendingUp className="h-4 w-4" />
  EVM
</TabsTrigger>

// タブコンテンツに追加（line 288付近、tableタブコンテンツの後）
<TabsContent value="evm">
  <EvmTabContent
    wbsId={latestWbs.id}
    projectStartDate={project.startDate}
    projectEndDate={project.endDate}
  />
</TabsContent>
```

## 8. テスト仕様

### 8.1 ユニットテスト
```typescript
// src/__tests__/domains/evm/EvmMetrics.test.ts
describe('EvmMetrics', () => {
  it('should calculate SV correctly', () => {
    const metrics = new EvmMetrics(new Date(), 100, 80, 90, 200);
    expect(metrics.sv).toBe(-20);
  });

  it('should calculate SPI correctly', () => {
    const metrics = new EvmMetrics(new Date(), 100, 80, 90, 200);
    expect(metrics.spi).toBe(0.8);
  });
  // ... その他のテストケース
});
```

### 8.2 統合テスト
```typescript
// src/__integration_tests__/evm/EvmRepository.test.ts
describe('EvmRepository', () => {
  it('should fetch WBS EVM data correctly', async () => {
    const repository = new EvmRepository();
    const data = await repository.getWbsEvmData(1, new Date());
    expect(data).toBeDefined();
    expect(data.tasks).toBeInstanceOf(Array);
  });
  // ... その他のテストケース
});
```

## 9. パフォーマンス最適化

### 9.1 クエリ最適化
- Prismaの`include`を必要最小限に
- N+1問題の回避（`findMany`の活用）
- インデックスの追加（必要に応じて）

### 9.2 キャッシュ戦略
- React Queryのstale timeを適切に設定
- 静的なデータ（完了済みタスク）のキャッシュ期間を長く
- リアルタイムデータのキャッシュ期間を短く

### 9.3 データ量対策
- ページネーション実装（大量タスク時）
- データの集約（サーバーサイド）
- 必要に応じた遅延ローディング

## 10. エラーハンドリング

### 10.1 エラーケース
- WBSが存在しない
- タスクに期間情報がない
- 実績工数が0
- 計算結果が無限大/NaN

### 10.2 エラー処理
```typescript
// エラーバウンダリーコンポーネントの実装
// ユーザーフレンドリーなエラーメッセージ
// ロギングとモニタリング
```

## 11. セキュリティ考慮事項

- 認証・認可の確認
- SQLインジェクション対策（Prisma使用）
- XSS対策（React自動エスケープ）
- APIレート制限

## 12. 実装チェックリスト

- [ ] ドメインエンティティの実装
- [ ] リポジトリインターフェースの定義
- [ ] リポジトリ実装（Prisma）
- [ ] サービス層の実装
- [ ] APIエンドポイントの実装
- [ ] UIコンポーネント（Chart）
- [ ] UIコンポーネント（Dashboard）
- [ ] UIコンポーネント（Table）
- [ ] プロジェクトページへの統合
- [ ] 依存性注入の設定
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] パフォーマンステスト
- [ ] ドキュメント更新