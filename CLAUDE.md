# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## プロジェクト概要

このプロジェクトは、Next.js 15、TypeScript、Prismaを使用して構築されたプロジェクト管理アプリケーションです。プロジェクト計画とタスク管理のためのWBS（Work Breakdown Structure）システムを特徴としています。アプリケーションは依存性注入（Inversify）を使用したクリーンアーキテクチャパターンを採用し、ドメイン駆動設計の原則に従っています。

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

# 本番サーバーを起動
npm start

# 依存関係をインストール（必要に応じてlegacy peer depsを使用）
npm install --legacy-peer-deps
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

### DDDを使用したクリーンアーキテクチャ

コードベースは関心の分離が明確なクリーンアーキテクチャパターンに従っています：

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