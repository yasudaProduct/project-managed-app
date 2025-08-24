# ダッシュボードのCQRSアーキテクチャ

## 概要

CQRSパターンを採用することで、コマンド（書き込み）とクエリ（読み取り）を分離し、ダッシュボードのような複雑な読み取り要求に最適化されたアーキテクチャを実現します。

## ディレクトリ構成

```
src/
├── applications/
│   ├── dashboard/
│   │   ├── queries/                    # Query側
│   │   │   ├── get-dashboard-stats/
│   │   │   │   ├── get-dashboard-stats.query.ts
│   │   │   │   ├── get-dashboard-stats.handler.ts
│   │   │   │   └── get-dashboard-stats.result.ts
│   │   │   ├── get-active-projects/
│   │   │   │   ├── get-active-projects.query.ts
│   │   │   │   ├── get-active-projects.handler.ts
│   │   │   │   └── get-active-projects.result.ts
│   │   │   └── get-recent-activities/
│   │   │       ├── get-recent-activities.query.ts
│   │   │       ├── get-recent-activities.handler.ts
│   │   │       └── get-recent-activities.result.ts
│   │   ├── read-models/                # 読み取り専用モデル
│   │   │   ├── dashboard-stats.read-model.ts
│   │   │   ├── project-summary.read-model.ts
│   │   │   └── activity-log.read-model.ts
│   │   └── repositories/               # Query用リポジトリ
│   │       ├── idashboard-query.repository.ts
│   │       └── dashboard-query.repository.ts
│   └── shared/
│       ├── query-bus/                  # Queryバス
│       │   ├── iquery.ts
│       │   ├── iquery-handler.ts
│       │   └── query-bus.ts
│       └── cqrs/
│           └── base-classes.ts
```

## 主要コンポーネント

### 1. Query（クエリ）
読み取り要求を表現するオブジェクト。必要なパラメータのみを含む。

### 2. Query Handler（クエリハンドラ）
クエリを受け取り、必要なデータを取得して結果を返す。

### 3. Read Model（読み取りモデル）
クエリ側に最適化されたデータ構造。ドメインモデルとは独立。

### 4. Query Repository（クエリリポジトリ）
読み取り専用のデータアクセス層。複雑なJOINやビューを使用可能。

### 5. Query Bus（クエリバス）
クエリとハンドラを結びつけるディスパッチャー。

## 利点

1. **パフォーマンス最適化**: 読み取り専用のデータ構造とクエリ
2. **スケーラビリティ**: 読み取りと書き込みを独立してスケール可能
3. **複雑なクエリ**: ダッシュボードに必要な集計や結合を効率的に実行
4. **キャッシング**: Query結果を容易にキャッシュ可能
5. **保守性**: 読み取りロジックがドメインロジックから分離

## 実装の流れ

1. UIから`GetDashboardStatsQuery`を発行
2. QueryBusがクエリを適切なハンドラにルーティング
3. ハンドラがQueryRepositoryを使用してデータ取得
4. 結果をRead Modelにマッピング
5. UIに最適化されたデータ構造を返却