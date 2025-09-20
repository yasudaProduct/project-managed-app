# アーキテクチャ原則

本プロジェクトはオニオンアーキテクチャを土台に、読み取り最適化にCQRSを一部導入します。依存の方向を内側へ保ち、ドメイン中心で設計します。

## 基本原則
- 依存は内向き（Domain ← Application ← Infrastructure/UI）
- ドメインにビジネスルールを閉じ込める（貧血モデル禁止）
- インフラ詳細（DB/外部API）は境界の外側に隔離
- テスト容易性を重視
- 読み取りは必要に応じてCQRSで最適化

## レイヤ責務
- Domain: エンティティ/値オブジェクト/ドメインサービス
- Application: ユースケース、トランザクション、リポジトリIF
- Infrastructure: リポジトリ実装、外部I/O
- UI: Next.js(App Router/Components/API Routes)

## 依存ルール

### 依存関係マトリクス（レイヤ間）
| From \ To | Domain | Application | Infrastructure | UI |
|---|---|---|---|---|
| Domain | ✓ | ✗ | ✗ | ✗ |
| Application | ✓ | ✓ | ✗ | ✗ |
| Infrastructure | ✓ | ✓ (IFに限る) | ✓ | ✗ |
| UI | ✗ | ✓ | ✗ | ✓ |

補足:
- Infrastructure→Applicationは「インターフェース」への依存のみ可。UI/具体実装へは依存不可。
- UIはRepositoryやPrisma等の具体実装へは直接依存不可。必ずApplication経由。

### ディレクトリ別 import ルール
- `src/domains/**`
  - 依存「可」: 
    - `src/domains/**`
    - `src/types/**`
- `src/applications/**`
  - 依存「可」:
    - `src/domains/**`
    - `src/applications/**`
    - `src/types/**`
    - `src/utils/**`（副作用なし）
- `src/infrastructures/**`
  - 依存「可」: 
    - `src/applications/**`（インターフェース/DTO等の契約）
    - `src/domains/**`（マッピング用）
    - `src/types/**`
    - `src/lib/**`, Prisma Client
- `src/app/**` と `src/components/**`（UI層）
  - 依存「可」: 
    - `src/applications/**`
    - `src/components/**`
    - `src/hooks/**`,
    - `src/lib/**`,
    - `src/types/**`
- `src/utils/**`, `src/types/**`（共有ユーティリティ）
  - 原則として他レイヤに依存しない。どのレイヤからも参照可。

## エラーハンドリング

## ロギング/監査

## セキュリティ
