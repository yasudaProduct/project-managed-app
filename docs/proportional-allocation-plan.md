# 月別担当者別集計表における営業日案分ロジック設計（改訂版）

## 概要

現在の月別・担当者別集計表では、タスクが月をまたぐ場合、タスクの予定開始日（`yoteiStart`）の月にすべての工数が計上されています。これを、**担当者固有の稼働時間・休暇と会社既定の休日を考慮した営業日に応じて工数を案分する仕組み**に改善します。

## 現在の実装状況

### 集計データの生成場所
- **ファイル**: `src/applications/wbs/query/get-wbs-summary-handler.ts:109`
- **メソッド**: `calculateMonthlyAssigneeSummary`
- **現在のロジック**: タスクの`yoteiStart`の月に全工数を計上

```typescript
// 現在のコード（119-120行目）
const date = new Date(task.yoteiStart);
const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
```

### 既存の営業日関連機能
- **祝日判定**: `src/lib/utils.ts`の`isHoliday`関数（日本の祝日 + 土日）
- **稼働可能時間計算**: `src/domains/wbs/get-operation-possible.ts`
- **担当者の稼働率**: `WbsAssignee.getRate()`メソッド  
- **ユーザースケジュール**: `UserSchedule`テーブル（個人の予定・休暇）

### 対象データ構造
- **MonthlyAssigneeData**: 月別担当者データ（plannedHours, actualHours含む）
- **タスクデータ**: `yoteiStart`（予定開始日）と`yoteiEnd`（予定終了日）、`yoteiKosu`（予定工数）、`assignee`（担当者）

## DDDに基づく営業日案分ロジック設計

### 1. ドメインモデル設計

#### 1.1 新しいドメインエンティティ・値オブジェクト

```typescript
// src/domains/calendar/business-day-period.ts
export class BusinessDayPeriod {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
    private readonly assignee: Assignee
  ) {}

  // 期間の営業日数を担当者固有の条件で計算
  getBusinessDaysCount(): number
  
  // 月ごとの営業日数を取得
  getBusinessDaysByMonth(): Map<string, number>
  
  // 工数を営業日数で案分
  distributeHoursByBusinessDays(totalHours: number): Map<string, number>
}

// src/domains/calendar/assignee-working-calendar.ts  
export class AssigneeWorkingCalendar {
  constructor(
    private readonly assignee: Assignee,
    private readonly companyCalendar: CompanyCalendar,
    private readonly userSchedules: UserSchedule[]
  ) {}

  // 指定日が担当者にとって稼働可能日かを判定
  isWorkingDay(date: Date): boolean
  
  // 指定日の稼働可能時間を計算
  getAvailableHours(date: Date): number
}

// src/domains/calendar/company-calendar.ts
export class CompanyCalendar {
  // 会社既定の休日判定（祝日・土日・会社独自休日）
  isCompanyHoliday(date: Date): boolean
  
  // 基準稼働時間を取得
  getStandardWorkingHours(): number
}
```

#### 1.2 ドメインサービス

```typescript
// src/domains/calendar/working-hours-allocation.service.ts
export class WorkingHoursAllocationService {
  constructor(
    private readonly companyCalendar: CompanyCalendar
  ) {}

  // タスクの工数を担当者の営業日で月別に案分
  allocateTaskHoursByAssigneeWorkingDays(
    task: Task,
    assignee: Assignee,
    userSchedules: UserSchedule[]
  ): Map<string, number> {
    const calendar = new AssigneeWorkingCalendar(assignee, this.companyCalendar, userSchedules);
    const period = new BusinessDayPeriod(task.yoteiStart, task.yoteiEnd, assignee);
    
    return period.distributeHoursByBusinessDays(task.yoteiKosu);
  }
}
```

### 2. 案分計算の詳細ロジック

#### 2.1 営業日の判定ルール（担当者固有）

```typescript
// AssigneeWorkingCalendar.isWorkingDay()の実装ロジック
isWorkingDay(date: Date): boolean {
  // 1. 会社既定の休日チェック
  if (this.companyCalendar.isCompanyHoliday(date)) {
    return false;
  }
  
  // 2. 担当者個人の休暇・予定チェック
  const userSchedule = this.getUserScheduleForDate(date);
  if (userSchedule && userSchedule.isFullDayOff()) {
    return false;
  }
  
  // 3. 担当者の稼働率チェック
  if (this.assignee.getRate() === 0) {
    return false;
  }
  
  return true;
}
```

#### 2.2 稼働可能時間の計算

```typescript
getAvailableHours(date: Date): number {
  if (!this.isWorkingDay(date)) {
    return 0;
  }
  
  const standardHours = this.companyCalendar.getStandardWorkingHours(); // 7.5
  const assigneeRate = this.assignee.getRate(); // 0.0-1.0
  
  // ユーザースケジュールによる減算（半休等）
  const userSchedule = this.getUserScheduleForDate(date);
  const scheduledHours = userSchedule ? userSchedule.getScheduledHours() : 0;
  
  const availableHours = Math.max(0, standardHours - scheduledHours);
  return availableHours * assigneeRate;
}
```

#### 2.3 案分計算式

```
月Aの案分工数 = 総予定工数 × (月Aの担当者稼働可能時間 / タスク期間の総担当者稼働可能時間)

where:
  月Aの担当者稼働可能時間 = Σ(月A内各日の担当者稼働可能時間)
  担当者稼働可能時間 = 基準時間 × 担当者稼働率 - ユーザースケジュール時間
```

### 3. データベース設計の拡張

#### 3.1 会社休日テーブル（新規）

```sql
-- 会社独自の休日を管理
CREATE TABLE company_holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'NATIONAL', 'COMPANY', 'SPECIAL'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 UserScheduleテーブルの活用

既存の`UserSchedule`テーブルを利用して個人の予定・休暇を管理。

### 4. アプリケーション層での統合

#### 4.1 修正対象メソッドの改修

```typescript
// src/applications/wbs/query/get-wbs-summary-handler.ts
private async calculateMonthlyAssigneeSummary(tasks: WbsTaskData[]) {
  const monthlyData: MonthlyAssigneeData[] = [];
  const workingHoursAllocationService = new WorkingHoursAllocationService(companyCalendar);
  
  for (const task of tasks) {
    if (!task.assignee?.displayName || !task.yoteiStart) continue;
    
    const assignee = Assignee.fromDisplayName(task.assignee.displayName);
    const userSchedules = await this.getUserSchedules(assignee, task.yoteiStart, task.yoteiEnd);
    
    if (!task.yoteiEnd || isSameMonth(task.yoteiStart, task.yoteiEnd)) {
      // 単月処理（既存ロジック）
      this.addToMonth(task, task.yoteiKosu, task.jissekiKosu);
    } else {
      // 営業日案分処理
      const allocatedHours = workingHoursAllocationService.allocateTaskHoursByAssigneeWorkingDays(
        task, assignee, userSchedules
      );
      
      allocatedHours.forEach((hours, yearMonth) => {
        this.addToMonth(task, hours, 0); // 予定工数のみ案分、実績は別途
      });
    }
  }
  
  return this.buildMonthlyAssigneeSummary(monthlyData);
}
```

### 5. 実装フェーズ

#### Phase 1: ドメインモデル構築
1. **CompanyCalendar**ドメインエンティティの実装
2. **AssigneeWorkingCalendar**ドメインエンティティの実装  
3. **BusinessDayPeriod**値オブジェクトの実装
4. **WorkingHoursAllocationService**ドメインサービスの実装

#### Phase 2: インフラストラクチャ実装
1. **CompanyHolidayRepository**の実装（会社休日データアクセス）
2. **UserScheduleRepository**の拡張（期間検索機能追加）
3. データベースマイグレーション（company_holidaysテーブル）

#### Phase 3: アプリケーションサービス統合
1. **GetWbsSummaryHandler**の修正
2. 依存性注入の設定更新
3. 統合テストの作成

#### Phase 4: 最適化・運用準備
1. パフォーマンステスト
2. メモ化・キャッシュ機能の追加
3. 運用監視・ログ追加

### 6. テスト戦略

#### 6.1 ドメインロジックテスト
```typescript
describe('WorkingHoursAllocationService', () => {
  test('担当者の有給休暇を考慮した案分計算', () => {
    // 担当者Aが1月20日に有給取得
    // タスク期間: 1月15日-25日（予定工数100時間）
    // 期待結果: 1月19日、21-25日の稼働日数で案分
  });
  
  test('担当者の稼働率0.5の場合の案分計算', () => {
    // 半日勤務者の案分ロジック確認
  });
  
  test('会社独自休日を考慮した案分計算', () => {
    // 年末年始特別休暇等の会社休日考慮
  });
});
```

### 7. 運用・保守性

#### 7.1 設定の外部化
- 基準稼働時間（7.5h）の設定ファイル化
- 会社独自休日の管理画面実装

#### 7.2 監視・ログ
- 案分計算結果のログ出力
- パフォーマンス監視（大量タスク処理時）

## 従来案との比較

| 項目 | 従来案 | 改訂案（DDD + 担当者考慮） |
|------|--------|---------------------------|
| 営業日判定 | 祝日・土日のみ | 担当者個別の休暇・稼働時間も考慮 |
| アーキテクチャ | ユーティリティクラス | ドメインモデル + ドメインサービス |
| 拡張性 | 限定的 | 会社独自ルール・担当者条件の柔軟な拡張 |
| テスタビリティ | 中程度 | ドメインロジックの独立テスト可能 |
| ビジネスロジック | 分散 | ドメイン層に集約 |

この設計により、単純な営業日計算から、実際の業務実態に即した担当者固有の稼働条件を考慮した精密な工数案分が可能になります。