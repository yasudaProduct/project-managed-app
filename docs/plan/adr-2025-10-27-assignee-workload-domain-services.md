# ADR: 作業負荷配分・警告検出ロジックをドメインサービスへ移管する

日付: 2025-10-27  
ステータス: Accepted  
決定者: 開発チーム

## 文脈（Context）

`AssigneeGanttService`（アプリケーション層）に、以下の業務ロジックが実装されている。

- 期間内の作業負荷配分（可用時間比率に基づく按分）
- タスクの期間内アクティブ判定
- 稼働可能日が存在しない場合の警告検出
- 日付レンジ・時刻範囲の算出

これらはドメインルールであり、テスト容易性・再利用性の観点からドメイン層へ集約したい。

## 決定（Decision）

- ドメイン層に以下を導入する。
  - 値オブジェクト: `DateRange`, `TimeRange`
  - ドメインサービス: `WorkloadAllocator`, `WarningDetector`
  - 戦略インターフェース: `AllocationStrategy`
  - 既定戦略: `ProportionalToAvailabilityStrategy`（可用時間比率按分）
- アプリケーション層はリポジトリから取得したデータをドメインサービスへ渡し、戻り値を組み立てる役割に限定する。
- 公開API（アプリケーションサービスのメソッドシグネチャ）は原則維持する。

## 代替案（Alternatives）

1. 現状維持（アプリ層にロジックを残す）

- Pros: 実装変更が少ない
- Cons: 責務が不明確、ロジックの重複/分散、テストが煩雑

1. ユースケースごとにアプリケーションサービスを分割

- Pros: ファイルは小さくなる
- Cons: ロジックの本質的な所在は変わらず、ドメインとしての再利用性が上がらない

1. 先に戦略のみ導入し、残りは追随

- Pros: 影響範囲をさらに縮小できる
- Cons: 値オブジェクトや検出ロジックの散在が残り、移行が長期化

## 影響（Consequences）

- Positive
  - 業務ルールの再利用性・テスト容易性の向上
  - 仕様変更（配分戦略の差し替えなど）に強くなる
  - タイムゾーン/境界日などの扱いをVOに閉じ込めやすい
- Negative
  - 初期移行コスト（クラス導入、テスト追加、呼び出し差し替え）
  - ドメイン層のクラス数増加による学習コスト

## 実装方針（Implementation）

1. `DateRange`, `TimeRange` を追加し、既存メソッドの内部ロジックを段階的に置換
2. `isTaskActiveOnDate` を `Task` または `TaskSchedule/DateRange` へ移動
3. `WorkloadAllocator` を追加し、`calculateDailyAllocations`/`calculateTaskAllocationsForDate` を移植
4. `WarningDetector` を追加し、`getAssigneeWarnings` から検出ロジックを移植
5. 未使用の `calculateTaskHoursForDate` は削除するか、戦略（均等割り）として整理

## テスト（Testing）

- VOの境界/タイムゾーンテスト
- 戦略の代表ケース（可用0、休日のみ、端数丸め）
- アロケータの合算整合性（各日の配分合計 = タスク総工数）
- 検出器のNo-Working-Days検出の網羅
- 既存インテグレーションテストがグリーンであること

## ロールバック（Rollback）

- 影響が大きい場合は、アプリ層メソッドにフラグで旧実装を残し切替可能にする（短期）
- ドメインサービス導入のコミット単位でリバートできるようPRを分割する

## 関連（References）

- 計画書: `docs/plan/assignee-gantt-onion-separation-plan.md`
- 対象: `src/applications/assignee-gantt/assignee-gantt.service.ts`
