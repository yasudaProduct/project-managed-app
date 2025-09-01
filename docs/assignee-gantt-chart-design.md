# 担当者別ガントチャート機能設計書

## 概要

担当者が1日に何時間作業が予定されているのかが分かるガントチャート形式の表で確認できる画面を作成する。担当者ごとに無理のあるタスクが設定されていないかを確認できるようにすることが目的。

## 既存システム分析

### 関連するドメインモデル

1. **Task（タスク）**
   - 予定期間（YOTEI）と実績期間の管理
   - 担当者（assignee）との関連
   - 工数（ManHour）の管理

2. **UserSchedule（ユーザースケジュール）**
   - 個人の予定管理
   - 日付、開始時刻、終了時刻の管理

3. **CompanyHoliday（会社休日）**
   - 会社の営業日管理
   - 国民の祝日、会社休日、特別休日の分類

4. **GetOperationPossible**
   - 稼働可能時間の算出ロジック
   - プロジェクト期間内での日別稼働時間計算

5. **ScheduleGenerate**
   - タスクの工数を稼働可能時間に基づいて日別に配分

### 既存の月別集計機能

現在、`MonthlyAssigneeSummary`コンポーネントにて以下の機能が実装済み：
- 月跨ぎタスクの按分計算
- 担当者別の工数集計
- タスクの詳細表示機能

## 機能要件

### 主要機能
1. **担当者別ガントチャート表示**
   - 担当者ごとの日別作業予定時間を可視化
   - 横軸：日付（カレンダー形式）
   - 縦軸：担当者
   - セル内容：その日の予定作業時間

2. **工数配分計算**
   - タスクの予定工数を予定期間の間で按分
   - 会社休日とUserScheduleと設定された稼働率を考慮した稼働可能時間での配分
   - 7.5hを上限とした工数チェック

3. **作業負荷の可視化**
   - 1日の作業予定時間に応じた色分け表示
   - 過負荷状態（7.5時間超過）の警告表示
   - 稼働率による色のグラデーション

4. **期間フィルタ機能**
   - 週別、月別、カスタム期間での表示切り替え
   - スクロール可能な期間表示

## 技術設計

### アーキテクチャ構成

```
┌─ Presentation Layer ─┐
│  AssigneeGanttChart  │ ← React Component
└──────────────────────┘
           │
┌─ Application Layer ──┐
│AssigneeGanttService  │ ← Business Logic
└──────────────────────┘
           │
┌─ Domain Layer ────────┐
│ AssigneeWorkload     │ ← Domain Model
│ DailyWorkAllocation  │
└──────────────────────┘
           │
┌─ Infrastructure ─────┐
│ TaskRepository       │ ← Data Access
│ UserScheduleRepo...  │
│ CompanyHolidayRepo...│
└──────────────────────┘
```

### ドメインモデル設計

#### 1. AssigneeWorkload（担当者作業負荷）
```typescript
export class AssigneeWorkload {
  assigneeId: string;
  assigneeName: string;
  dailyAllocations: DailyWorkAllocation[];
  
  // 過負荷日をチェック
  getOverloadedDays(): DailyWorkAllocation[];
  
  // 期間内の総作業時間を計算
  getTotalHours(startDate: Date, endDate: Date): number;
}
```

#### 2. DailyWorkAllocation（日別作業配分）
```typescript
export class DailyWorkAllocation {
  date: Date;
  allocatedHours: number;
  taskAllocations: TaskAllocation[];
  availableHours: number;
  
  // 過負荷かチェック
  isOverloaded(): boolean;
  
  // 稼働率を計算
  getUtilizationRate(): number;
}
```

#### 3. TaskAllocation（タスク配分）
```typescript
export class TaskAllocation {
  taskId: string;
  taskName: string;
  allocatedHours: number;
  originalTask: Task;
}
```

### アプリケーションサービス設計

#### AssigneeGanttService
```typescript
export interface IAssigneeGanttService {
  // 担当者別ガントチャートデータを取得
  getAssigneeWorkloads(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload[]>;
  
  // 特定担当者の作業負荷を取得
  getAssigneeWorkload(
    wbsId: number,
    assigneeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload>;
}
```

### 工数配分アルゴリズム

#### 1. 稼働可能時間計算
```typescript
// 既存のGetOperationPossibleを拡張
class EnhancedOperationPossible extends GetOperationPossible {
  async execute(
    project: Project, 
    wbs: Wbs, 
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    companyHolidays: CompanyHoliday[]
  ): Promise<{ [date: string]: number }> {
    // 1. 基本稼働時間（7.5h）から開始
    // 2. 会社休日を除外
    // 3. UserScheduleによる個人予定を減算
    // 4. 担当者の参画率を適用
  }
}
```

#### 2. タスク工数配分
```typescript
class TaskHourAllocation {
  // タスクの工数を期間内の稼働可能時間で按分
  allocateTaskHours(
    task: Task,
    availableHours: { [date: string]: number }
  ): { [date: string]: number } {
    // 1. タスク期間内の総稼働可能時間を計算
    // 2. タスクの予定工数を比例配分
    // 3. 各日の上限（稼働可能時間）を超えないよう調整
  }
}
```

### UIコンポーネント設計

#### 1. AssigneeGanttChart（メインコンポーネント）
```typescript
interface AssigneeGanttChartProps {
  wbsId: number;
  startDate: Date;
  endDate: Date;
  viewMode: 'week' | 'month' | 'custom';
}
```

#### 2. GanttHeader（ヘッダー部分）
- 日付軸の表示
- 土日祝日のハイライト
- 期間切り替えコントロール

#### 3. GanttRow（担当者行）
```typescript
interface GanttRowProps {
  assignee: AssigneeWorkload;
  dateRange: Date[];
  onCellClick: (assignee: string, date: Date) => void;
}
```

#### 4. GanttCell（セル）
```typescript
interface GanttCellProps {
  allocation: DailyWorkAllocation;
  isWeekend: boolean;
  isHoliday: boolean;
}
```

#### 色分けルール
- **緑系**：稼働率 0-60%（余裕あり）
- **黄系**：稼働率 60-80%（適正）  
- **橙系**：稼働率 80-100%（高負荷）
- **赤系**：稼働率 100%超（過負荷）
- **グレー**：休日・非稼働日

### データフロー

1. **初期データ取得**
   ```
   WBS → Tasks → Assignees → UserSchedules → CompanyHolidays
   ```

2. **稼働可能時間計算**
   ```
   基本稼働時間 - 会社休日 - 個人予定 × 参画率 = 稼働可能時間
   ```

3. **工数配分計算**
   ```
   タスク予定工数 ÷ 総稼働可能時間 × 各日稼働可能時間 = 日別配分時間
   ```

4. **表示データ生成**
   ```
   担当者 × 日付 × 配分時間 → ガントチャートデータ
   ```

## 実装計画

### Phase 1: ドメインモデル実装
- AssigneeWorkload, DailyWorkAllocation, TaskAllocationクラス
- 工数配分計算ロジック

### Phase 2: アプリケーションサービス実装  
- AssigneeGanttService
- 既存サービスとの統合

### Phase 3: UIコンポーネント実装
- ベースとなるガントチャートコンポーネント
- 色分け表示ロジック

### Phase 4: 詳細機能実装
- 期間フィルタ機能
- セル詳細表示
- エクスポート機能

## ファイル構成

```
src/
├── domains/
│   └── assignee-workload/
│       ├── assignee-workload.ts
│       ├── daily-work-allocation.ts
│       └── task-allocation.ts
├── applications/
│   └── assignee-gantt/
│       ├── assignee-gantt.service.ts
│       └── iassignee-gantt.service.ts
├── components/
│   └── assignee-gantt/
│       ├── assignee-gantt-chart.tsx
│       ├── gantt-header.tsx
│       ├── gantt-row.tsx
│       └── gantt-cell.tsx
└── app/
    └── wbs/
        └── [id]/
            └── assignee-gantt/
                └── page.tsx
```

## 今後の拡張性

1. **リアルタイム更新**：タスク変更時の自動再計算
2. **アラート機能**：過負荷状態の自動検知・通知
3. **チーム分析**：チーム全体の負荷バランス分析

この設計により、担当者の作業負荷を効果的に可視化し、プロジェクト管理の品質向上を支援する。