# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## プロジェクト概要

このプロジェクトは、Next.js 15、TypeScript、Prismaを使用して構築されたプロジェクト管理アプリケーションです。プロジェクト計画とタスク管理のためのWBS（Work Breakdown Structure）システムを特徴としています。アプリケーションは依存性注入（Inversify）を使用したオニオンアーキテクチャパターンを採用し、ドメイン駆動設計の原則に従っています。

## Development Philosophy

### Test-Driven Development (TDD)

- 原則としてテスト駆動開発（TDD）で進める
- 期待される入出力に基づき、まずテストを作成する
- 実装コードは書かず、テストのみを用意する
- テストを実行し、失敗を確認する
- テストが正しいことを確認できた段階でコミットする
- その後、テストをパスさせる実装を進める
- 実装中はテストを変更せず、コードを修正し続ける
- すべてのテストが通過するまで繰り返す

## コマンド

### 開発
```bash
# Turbopackを使用して開発サーバーを起動
npm run dev

# 本番用にビルド
npm run build

# 依存関係をインストール
npm install
```

### テスト
```bash
# ユニットテストを実行
npm run test

# ユニットテストをウォッチモードで実行
npm run test:watch

# カバレッジ付きでユニットテストを実行
npm run test:coverage

# 統合テストを実行
npm run test:integration

# 統合テストをウォッチモードで実行
npm run test:integration:watch
```

### リンティング
```bash
# ESLintを実行
npm run lint
```

### データベース（Prisma）
```bash
# Prismaクライアントを生成
npx prisma generate

# データベースマイグレーションを実行
npx prisma migrate dev

# 新しいマイグレーションを作成
npx prisma migrate dev --name <migration_name>

# データベースをシード
npx prisma db seed
```

## アーキテクチャ

### DDDを使用したオニオンアーキテクチャ

コードベースは関心の分離が明確なオニオンアーキテクチャパターンに従っています：

- **Domains**（`src/domains/`）：コアビジネスロジックとエンティティ
- **Applications**（`src/applications/`）：アプリケーションサービスとユースケース
- **Infrastructures**（`src/infrastructures/`）：データアクセス層（リポジトリ）
- **UI**（`src/app/`, `src/components/`）：Next.js App Routerページとリアクトコンポーネント

### 主要なアーキテクチャパターン

1. **依存性注入**：依存関係管理にInversifyコンテナ（`src/lib/inversify.config.ts`）を使用
2. **リポジトリパターン**：アプリケーション層のインターフェースを使用したデータアクセス抽象化
3. **ドメインサービス**：ドメインサービスにカプセル化されたビジネスロジック
4. **アプリケーションサービス**：ユースケースを調整し、ドメインとインフラストラクチャ間を連携

### コアドメイン

- **Project**：ステータス追跡と日付検証を含むプロジェクト管理
- **WBS**：プロジェクト計画のためのWork Breakdown Structure
- **Task**：期間、担当者、工数を含む個別タスク
- **User**：スケジュールと作業記録を含むユーザー管理
- **Phase**：テンプレートとシーケンスを含むプロジェクトフェーズ

### データベーススキーマ

アプリケーションはPrisma ORMを使用したPostgreSQLを使用しています。詳細なエンティティ関係図は`ERD.md`を参照してください。主要なエンティティには以下が含まれます：
- WBS構造を持つプロジェクト
- 期間と担当者を持つタスク
- ユーザースケジュールと作業記録
- フェーズテンプレートとマイルストーン

## テスト戦略

### ユニットテスト（`src/__tests__/`）
- ドメインロジックテスト
- アプリケーションサービステスト
- React Testing Libraryを使用したコンポーネントテスト
- jsdom環境を使用

### 統合テスト（`src/__integration_tests__/`）
- リポジトリ統合テスト
- データベースインタラクションテスト
- 実際のデータベースを使用したnode環境

## 主要なライブラリとフレームワーク

- **Next.js 15**：App Routerを使用したReactフレームワーク
- **TypeScript**：型安全性
- **Prisma**：データベースORM
- **Inversify**：依存性注入
- **Radix UI**：コンポーネントプリミティブ
- **Tailwind CSS**：スタイリング
- **React Hook Form + Zod**：フォーム処理と検証
- **Tanstack Query**：データフェッチ
- **Jest**：テストフレームワーク

## 日付・タイムゾーンの取り扱いポリシー

このリポジトリでは、日時データの取り扱いに関して以下の原則に従います（クライアント/サーバー/DB 一貫）。

### 基本原則
- **保存は常に UTC**（ISO 8601 文字列、または UTC 値）
- **表示はユーザーのタイムゾーン**（ブラウザ既定の TZ または明示した TZ）
- **API 入出力は ISO 8601 文字列**（`toISOString()` の往復）
- **比較・集計は UTC/Epoch ミリ秒**（`Date#getTime()`）
- `<input type="datetime-local">` は **TZ 情報なし**のため、送信前に **UTC へ正規化**

### 実装ルール
- クライアント → サーバー送信：ISO 8601（末尾 `Z` を含む UTC）に変換して送る
- サーバー → クライアント返却：常に `toISOString()` を使用
- サーバー内部：`Date` の比較・計算は `getTime()` を基準に行う
- 表示整形：`Intl.DateTimeFormat` でユーザー TZ に整形
- 日付のみ（終日）の演算や DST を跨ぐ演算は **タイムゾーン対応ライブラリ（date-fns-tz/Luxon/Day.js+TZ）** を使用

### データベース/ORM（Prisma + MySQL）
- DB/サーバーのタイムゾーンは **UTC に固定**
- 列型選定：
  - `DATETIME`（TZなし）を **UTC 値**として保存する方針が安全
  - `TIMESTAMP` はサーバー/DB TZ 設定の影響を受けやすいので原則非推奨
- Prisma モデルの日時フィールドは **UTC 前提**で入出力する

### フロントエンドの取り扱い
- フォーム入力（`datetime-local`）はタイムゾーンを含まないため、**送信時に UTC ISO へ正規化**
- 表示は `Intl.DateTimeFormat(undefined, { ... })` を使用し、ユーザーのローカル TZ でレンダリング

最小ユーティリティ例：

```ts
// datetime-local（例: "2025-09-03T10:00"）→ UTC ISO（例: "2025-09-03T01:00:00.000Z" in JST）
export function localInputToUtcIso(local: string): string {
  const d = new Date(local); // ローカルとして解釈
  return new Date(
    Date.UTC(
      d.getFullYear(), d.getMonth(), d.getDate(),
      d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()
    )
  ).toISOString();
}

// UTC ISO → ユーザーTZ表示
export function formatInUserTZ(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  }).format(new Date(iso));
}
```

### サーバーサイドの取り扱い（Next.js/Node）
- 受信は ISO 8601 文字列想定で `new Date(iso)` により UTC として取り扱う
- 比較・保存：`date.getTime()` を用いる（UTC基準）
- 返却：`date.toISOString()` に統一

```ts
// 例：API ハンドラ内
const received = new Date(req.body.dueDate); // ISO 8601 前提
const millis = received.getTime();
// ... 保存・比較など UTC 基準で処理
res.json({ dueDate: received.toISOString() });
```

### テスト・品質
- テストでは TZ 依存の揺らぎを避けるため、**入力/期待値ともに ISO 8601（UTC）** を使用
- DST 境界（各地域の切替日）、月末、閏年等のケースを用意
- CI/実行環境の TZ は **UTC 固定**を推奨

### 禁止事項 / 落とし穴
- 末尾 `Z` を持たない ISO 風文字列（`2025-09-03T10:00`）を API でやり取りしない
- `Date.parse('YYYY-MM-DD')` など **実装依存のローカル解釈**に依存しない
- DB の `TIMESTAMP` に OS/DB の TZ 設定任せにしない
- `datetime-local` の値を **そのまま** サーバーへ送らない（必ず UTC 化）

### 推奨ライブラリ
- 軽量演算: `date-fns`、タイムゾーン変換: `date-fns-tz`
- 代替（包括的 API）: `Luxon`、`Day.js` + `timezone` プラグイン

本ポリシーに反する新規コードは差し戻し対象です。既存コードの逸脱を見つけた場合は、範囲を限定してリファクタの PR を推奨します。

## ファイル構造パターン

- `/src/app/`：Next.js App Routerのページとレイアウト
- `/src/components/`：再利用可能なReactコンポーネント
- `/src/domains/`：ドメインエンティティとビジネスロジック
- `/src/applications/`：アプリケーションサービスとインターフェース
- `/src/infrastructures/`：リポジトリ実装
- `/src/lib/`：ユーティリティライブラリと設定
- `/src/types/`：TypeScript型定義

## 開発ノート

### 新機能の追加
1. `/src/domains/`でドメインモデリングから開始
2. `/src/applications/`でアプリケーションサービスインターフェースを定義
3. `/src/infrastructures/`でリポジトリインターフェースを実装
4. `/src/lib/inversify.config.ts`で依存関係を登録
5. UIコンポーネントとページを作成

### データベースの変更
1. `/prisma/schema.prisma`でPrismaスキーマを更新
2. `npx prisma migrate dev --name <name>`を実行
3. ドメインエンティティとリポジトリインターフェースを更新
4. `npx prisma generate`を実行してクライアント型を更新

### テストガイドライン
- ドメインロジックのユニットテストを作成
- リポジトリ操作の統合テストを作成
- コンポーネントテストにReact Testing Libraryを使用
- `npm run test:coverage`でテストカバレッジを維持