# プロジェクト管理アプリケーション

Next.js 15、TypeScript、Prismaを使用して構築されたプロジェクト管理アプリケーションです。WBS（Work Breakdown Structure）システムを特徴とし、クリーンアーキテクチャパターンとドメイン駆動設計の原則に従っています。

## 目次

- [はじめに](#はじめに)
- [アーキテクチャ](#アーキテクチャ)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [データベース](#データベース)
- [テスト](#テスト)
- [コマンド一覧](#コマンド一覧)

## はじめに

### 前提条件

- Node.js 18.0以上
- npm または yarn
- PostgreSQL

### 開発サーバーの起動

```bash
# 依存関係をインストール
npm install --legacy-peer-deps

# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## アーキテクチャ

このプロジェクトは以下のアーキテクチャパターンを採用しています：

### オニオンアーキテクチャ

- **Domains**（`src/domains/`）：コアビジネスロジックとエンティティ
- **Applications**（`src/applications/`）：アプリケーションサービスとユースケース
- **Infrastructures**（`src/infrastructures/`）：データアクセス層（リポジトリ）
- **UI**（`src/app/`, `src/components/`）：Next.js App RouterページとReactコンポーネント

### 主要技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL, Prisma ORM
- **状態管理**: TanStack Query
- **UI コンポーネント**: Radix UI
- **依存性注入**: Inversify
- **テスト**: Jest, React Testing Library, Playwright

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd project-managed-app
```

### 2. 依存関係のインストール

```bash
npm install --legacy-peer-deps
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、必要な環境変数を設定してください。

## データベース

### Prismaセットアップ

```bash
# 初期マイグレーション
npx prisma migrate dev --name init

# マイグレーション実行
npx prisma migrate dev

# Prismaクライアント生成
npx prisma generate

# シードデータ投入
npx prisma db seed

# 
npx prisma migrate reset
```

### 新しいマイグレーション作成

```bash
npx prisma migrate dev --name <migration_name>
```

## テスト

このプロジェクトでは包括的なテスト戦略を採用しています：

### テスト戦略

1. **TDD（テスト駆動開発）**: 新機能開発時は原則としてテストファーストで進める
2. **多層テスト**: ユニット、統合、E2Eテストによる多層防御
3. **ビジュアルリグレッション**: Playwrightによるスクリーンショット比較
4. **継続的テスト**: CI/CDパイプラインでの自動テスト実行

### テストの種類と実行方法

#### 1. ユニットテスト（Jest + React Testing Library）

```bash
# ユニットテストを実行
npm run test

# ウォッチモードで実行
npm run test:watch

# カバレッジ付きで実行
npm run test:coverage
```

**対象範囲:**
- ドメインロジック
- アプリケーションサービス
- Reactコンポーネント
- ユーティリティ関数

**ファイル場所:** `src/__tests__/`

#### 2. 統合テスト（Jest）

```bash
# 統合テストを実行
npm run test:integration

# ウォッチモードで実行
npm run test:integration:watch
```

**対象範囲:**
- リポジトリとデータベースの統合
- APIエンドポイント
- 複数コンポーネント間の連携

**ファイル場所:** `src/__integration_tests__/`

#### 3. E2Eテスト（Playwright）

```bash
# E2Eテストを実行
npm run test:e2e

# ヘッドありモードで実行（ブラウザ表示）
npm run test:e2e:headed

# テストUIで実行
npm run test:e2e:ui
```

**対象範囲:**
- ユーザージャーニー全体
- ブラウザ間の互換性
- パフォーマンステスト

#### 4. ビジュアルリグレッションテスト（Playwright）

```bash
# ビジュアルテストを実行
npm run test:visual

# スクリーンショットを更新
npm run test:visual:update

# テストUIで確認
npm run test:visual:ui
```

**対象範囲:**
- UIコンポーネントの見た目の回帰テスト
- レスポンシブデザインの確認
- 異なるブラウザでの表示確認

### テスト環境のセットアップ

#### Playwrightの初期セットアップ

```bash
# セットアップスクリプトを実行
./scripts/setup-playwright.sh

# 手動セットアップの場合
npm install --save-dev @playwright/test
npx playwright install
```

### テストファイルの構成

```
src/
├── __tests__/                     # ユニットテスト
│   ├── components/               # コンポーネントテスト
│   ├── domains/                  # ドメインロジックテスト
│   ├── applications/             # アプリケーションサービステスト
│   └── helpers/                  # テストヘルパー関数
├── __integration_tests__/         # 統合テスト
│   ├── repositories/             # リポジトリテスト
│   └── api/                      # APIテスト
└── __tests__/e2e/                # E2Eテスト
    ├── gantt-visual.spec.ts      # ビジュアルリグレッションテスト
    └── helpers/                  # E2Eテストヘルパー
```

### テストのベストプラクティス

#### 1. テスト命名規約

```typescript
describe('コンポーネント名 or 機能名', () => {
  describe('特定の機能グループ', () => {
    test('具体的なテストケース', () => {
      // テストコード
    });
  });
});
```

#### 2. モックとテストデータ

```typescript
// テストヘルパーを活用
import { createMockProject, createMockTasks } from '@/tests/helpers/gantt-test-helpers';

const mockProject = createMockProject();
const mockTasks = createMockTasks(5);
```

#### 3. アサーション

```typescript
// 具体的で意味のあるアサーション
expect(screen.getByText('要件定義')).toBeInTheDocument();
expect(taskBar).toHaveAttribute('data-task-id', '1');
```

### CI/CDでのテスト実行

```yaml
# GitHub Actions例
- name: Run tests
  run: |
    npm run test:coverage
    npm run test:integration
    npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: coverage/
```

### テストカバレッジ

目標カバレッジ：
- **ユニットテスト**: 80%以上
- **統合テスト**: 主要機能の70%以上
- **E2E**: クリティカルユーザージャーニーの100%

### トラブルシューティング

#### よくある問題と解決方法

1. **Playwrightのブラウザが見つからない**
   ```bash
   npx playwright install
   ```

2. **テストがタイムアウトする**
   ```typescript
   // 待機時間を調整
   await page.waitForTimeout(1000);
   await page.waitForSelector('[data-testid="component"]');
   ```

3. **スクリーンショット比較が失敗する**
   ```bash
   # ベースラインを更新
   npm run test:visual:update
   ```

## コマンド一覧

### 開発

```bash
npm run dev          # 開発サーバー起動（Turbopack使用）
npm run build        # 本番用ビルド
npm run start        # 本番サーバー起動
npm run lint         # ESLint実行
```

### テスト

```bash
# ユニットテスト
npm run test                    # テスト実行
npm run test:watch             # ウォッチモード
npm run test:coverage          # カバレッジ付き実行

# 統合テスト
npm run test:integration       # 統合テスト実行
npm run test:integration:watch # ウォッチモード

# E2Eテスト
npm run test:e2e              # E2Eテスト実行
npm run test:e2e:headed       # ブラウザ表示あり
npm run test:e2e:ui           # テストUI

# ビジュアルテスト
npm run test:visual           # ビジュアルテスト実行
npm run test:visual:update    # スクリーンショット更新
npm run test:visual:ui        # テストUI
```

### データベース

```bash
npx prisma generate           # クライアント生成
npx prisma migrate dev        # マイグレーション実行
npx prisma db seed           # シードデータ投入
npx prisma studio            # Prisma Studio起動
```

## 開発ノート

### 新機能の追加手順

1. **テスト作成**: TDDに従い、まずテストを作成
2. **ドメインモデリング**: `/src/domains/`でドメインモデルを定義
3. **アプリケーションサービス**: `/src/applications/`でユースケースを実装
4. **インフラストラクチャ**: `/src/infrastructures/`でリポジトリを実装
5. **UI実装**: コンポーネントとページを作成
6. **E2Eテスト**: ユーザージャーニーをテスト

### コードレビューのチェックポイント

- [ ] ユニットテストが作成されている
- [ ] テストカバレッジが適切
- [ ] アーキテクチャ原則に従っている
- [ ] TypeScriptの型安全性が保たれている
- [ ] ESLintルールに準拠している