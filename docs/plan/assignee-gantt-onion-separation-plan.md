# 担当者ガントサービスのオニオン分離 提案と改修計画

最終更新: 2025-10-27

作成者: 開発チーム

対象ファイル: `src/applications/assignee-gantt/assignee-gantt.service.ts`

## 背景

担当者ガントのアプリケーションサービスに、期間内の配分アルゴリズムや警告判定など、ドメイン寄りの業務ルールが混在しています。オニオンアーキテクチャの観点で責務を分離し、ドメイン層へ業務ロジックを集約することで、再利用性とテスト容易性を高めます。

## 目的（成功条件）

- アプリケーション層は「データの取得とオーケストレーション」に限定されること
- 期間内配分・稼働判定・警告検出などの業務ルールがドメイン層に移管されること
- 既存の公開インターフェース（アプリサービスのメソッドシグネチャ）は原則維持
- 単体テストで主要ロジック（配分、警告）がカバーされ、計算の再現性が担保されること

## 現状整理（抜粋）

- `AssigneeGanttService` が以下を内包
  - リポジトリからの取得と集約（適切）
  - 日別配分計算（`calculateDailyAllocations`, `calculateTaskAllocationsForDate`）
  - タスクの期間判定（`isTaskActiveOnDate`）
  - 警告検出（`getAssigneeWarnings` 内）
  - 時刻範囲の所要時間算出（`calculateScheduleDuration`）
- 補助オブジェクトとして `CompanyCalendar`, `AssigneeWorkingCalendar`, `AssigneeWorkload` などは既に存在

## 課題

- 業務ロジックがアプリケーション層に散在し、再利用・テストが困難
- 日付処理（タイムゾーン/境界日の扱い）がメソッド内実装に散在
- 配分方針を差し替える拡張余地が少ない（戦略パターン化されていない）

## 提案概要

- アプリケーション層の責務
  - リポジトリ呼び出し（タスク、担当者、会社休日、個人予定）
  - ドメインサービスの呼び出しと結果の組み立て
- ドメインに移すロジック
  - 期間内のタスク配分アルゴリズム（可用時間比率で按分）
  - タスクの期間内判定（DateRange/TaskScheduleへ）
  - 警告（稼働可能日なし）の検出
  - 日付レンジ・時刻範囲の計算（値オブジェクトで集約）

### 新規/強化するドメインオブジェクト（案）

- 値オブジェクト
  - `DateRange { start: Date; end: Date; includes(date): boolean; days(): Date[] }`
  - `TimeRange { start: string; end: string; durationHours(): number }` // "HH:mm"
- ドメインサービス
  - `WorkloadAllocator`（作業負荷の計画）
    - 依存: `AllocationStrategy`（戦略パターン）
  - `WarningDetector`（警告検出）
- 戦略インターフェース
  - `AllocationStrategy`
    - 既定実装: `ProportionalToAvailabilityStrategy`（可用時間比率按分）
    - 将来: 均等割り、締切優先、重み付きなど

### 公開APIイメージ（概略）

```ts
interface AllocationStrategy {
  allocate(
    task: Task,
    calendar: AssigneeWorkingCalendar,
    period: DateRange
  ): Map<string /* yyyy-mm-dd */, number /* hours */>;
}

class WorkloadAllocator {
  constructor(
    private readonly strategy: AllocationStrategy = new ProportionalToAvailabilityStrategy()
  ) {}

  plan(
    assignee: WbsAssignee,
    tasks: Task[],
    companyCalendar: CompanyCalendar,
    schedules: UserSchedule[],
    period: DateRange
  ): AssigneeWorkload;
}

class WarningDetector {
  detect(
    tasks: Task[],
    assignee: WbsAssignee | null,
    companyCalendar: CompanyCalendar,
    schedules: UserSchedule[],
    period: DateRange
  ): Array<{
    taskId: number;
    reason: 'NO_WORKING_DAYS';
    periodStart: Date;
    periodEnd: Date;
    assigneeId?: string;
    assigneeName?: string;
  }>;
}
```

## 段階的移行計画（小さく安全に）

1. 基盤VO導入（低リスク）
   - `DateRange` 追加し、日付ループや toYMD 比較の重複/ばらつきを集約
   - `TimeRange` 追加し、所要時間算出を一箇所に集約
2. 期間内判定をドメインへ
   - `isTaskActiveOnDate` を `Task` または `TaskSchedule`/`DateRange` に移す
3. 配分ロジックのドメイン化（WorkloadAllocator）
   - `calculateDailyAllocations`, `calculateTaskAllocationsForDate` を移植
   - 戦略 `ProportionalToAvailabilityStrategy` を実装
   - アプリ層は `WorkloadAllocator.plan(...)` を呼ぶだけに
4. 警告検出のドメイン化（WarningDetector）
   - `NO_WORKING_DAYS` 判定を移植
   - アプリ層の `getAssigneeWarnings` は `WarningDetector.detect(...)` 呼び出しに薄く
5. 未使用/重複メソッドの整理
   - `calculateTaskHoursForDate` が不使用なら削除
   - あるいは戦略（均等割り）実装として移設
6. リファクタ後の最適化
   - インターフェースの命名・格納場所 (`domains/**`) の整備
   - コメント/Docstring 整備

## テスト戦略

- 単体テスト
  - `DateRange`, `TimeRange`: 境界日・タイムゾーン差異のテスト
  - `ProportionalToAvailabilityStrategy`: 比率按分の再現性（可用時間0、休日のみ、端数丸めなど）
  - `WorkloadAllocator`: 代表ケース（平日5日、休日混在、個人予定あり）
  - `WarningDetector`: 稼働可能時間総和0での検出、担当者未割当時の扱い
- 結合テスト
  - アプリサービスを通した一連の動作（既存の統合テストにシナリオを追加）
- 回帰観点
  - 既存APIの戻り値スキーマと計算結果が変わらないこと（仕様変更がなければ）

## リスクと対策

- タイムゾーン/日付比較の揺らぎ
  - VOに集約し、toYMD比較のばらつきを排除
- 計算仕様の暗黙依存
  - 戦略パターン化し、ドキュメント/テストで仕様を固定
- パフォーマンス
  - 期間内の反復をVO/サービス側で効率化（キャッシュ等）。必要に応じてプロファイル

## リリース計画

- フェーズ毎にPR分割（1〜2日ごとにマージ可能な粒度）
- 各PRでユニットテスト追加・通過を必須
- ステージングで既存画面の表示/集計の差分確認

## 作業見積（目安）

- VO導入と置換: 0.5〜1.0日
- 配分ロジック移設＋テスト: 1.0〜1.5日
- 警告検出移設＋テスト: 0.5〜1.0日
- 仕上げ/ドキュメント: 0.5日

## 受け入れ基準

- アプリ層の `AssigneeGanttService` がドメインサービス呼び出し中心になっている
- 単体テストで配分・警告の主要ケースがカバーされる（カバレッジ閾値: ロジック部80%以上目安）
- 既存のインテグレーションテストがグリーン

## 付録：簡易クラス図（概略）

```text
App: AssigneeGanttService
  -> repos (Task, WbsAssignee, UserSchedule, CompanyHoliday)
  -> Domain: WorkloadAllocator(AllocationStrategy), WarningDetector
  -> VO: DateRange, TimeRange
  -> Domain: CompanyCalendar, AssigneeWorkingCalendar
  -> Domain: AssigneeWorkload, DailyWorkAllocation, TaskAllocation
```
