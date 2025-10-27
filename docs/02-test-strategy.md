# 単体テスト戦略（Unit Test Strategy)

このドキュメントは、本プロジェクトにおける単体テストの目的・範囲・実行方法・実装規約を定義します。Next.js(App Router) + TypeScript を前提に、Jest + React Testing Library を利用します。

## ゴールと非ゴール

- ゴール
  - ドメインロジックとアプリケーションサービスの正しさを、高速かつ安定的に担保する
  - UIコンポーネントの入出力・イベント・表示条件の検証を行い、回 regressions を早期検知する
  - 副作用を持つ処理（DB/外部API）をモックし、ユニットの振る舞いにフォーカスする
- 非ゴール
  - DBや外部サービスを含む結合/E2Eの完全な検証（これは integration / e2e テストの責務）

## テストピラミッドと対象範囲

- Unit（本ドキュメントの対象）
  - ドメイン層（エンティティ/値オブジェクト/ドメインサービス）
  - アプリケーション層（ユースケース、DI経由でリポジトリをモック）
  - UIコンポーネント（純粋な表示とイベントハンドリングの検証）
- Integration（別設定: `jest.integration.config.js`）
  - APIルートやサーバーアクションの薄い結合、複数モジュール間の振る舞い
- E2E（Playwright）
  - 画面遷移、主要なユーザーフロー、ビジュアル回帰

## 使用ツールと設定

- フレームワーク: Jest（`jest.config.js`）
  - テスト環境: `jest-environment-jsdom`
  - 変換: `babel-jest`（Next/babelプリセット + Decorators）
  - テスト探索: `testRegex: /src/__tests__/.*\.test\.[jt]sx?$/`
  - カバレッジ: `collectCoverageFrom` にて `src/**/*.{ts,tsx,js,jsx}` を対象
- React Testing Library: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- モジュール解決: `@/` エイリアスは `<rootDir>/src/` にマップ
- 既存モック: `next/cache` は `__mocks__/next-cache.js` でモック済み
- セットアップ: `jest.setup.js`（fetch/TextEncoder/TextDecoderのポリフィルを含む）

## ディレクトリ構成と命名

- 置き場所: `src/__tests__/` 配下に配置（`jest.config.js` に準拠）
- 命名規則: `*.test.ts` / `*.test.tsx`
- ミラー構成推奨: 本体 `src/...` の構造を `src/__tests__/...` 側で概ね再現すると可読性が上がる
- フィクスチャ/ファクトリ: `src/__tests__/fixtures/` / `src/__tests__/factories/` を任意で作成し再利用

## 何をテストするか（対象別の指針）

### 1) ドメイン層

- エンティティ/値オブジェクトの不変条件・バリデーション
- ドメインサービスの計算・判定
- 外部I/Oは一切使用しない（純粋関数として検証）

例: 期日計算、進捗率の算出、ステータス遷移の妥当性

### 2) アプリケーション層（ユースケース）

- 入出力契約（引数/戻り値 `{ success: boolean; error?: string }` 等）
- 正常/境界/異常（依存が例外・エラーを返す）
- 依存（リポジトリ/ドメインサービス）は **モック** する
  - Inversify の代わりに、ユースケースのコンストラクタへ **手動DI** 可能であればそれを採用
  - やむを得ずコンテナに依存する場合は、テスト用に仮のコンテナを作り、依存を `jest.fn()` に差し替え

### 3) UIコンポーネント

- 入力プロップ → 出力（描画/イベント）
- ユーザー操作: `user-event` を用いてクリック/入力/キーボードを再現
- DOMアサート: `@testing-library/jest-dom` の拡張マッチャ（`toBeInTheDocument` 等）
- 実装詳細（内部状態やクラス名）ではなく、振る舞いとユーザー可視の結果に着目

## モック方針（副作用の隔離）

- Prisma/DB:
  - Unitでは実DBに触れない。`jest.mock('@/lib/prisma/prisma', () => ({ default: {/* ダミー実装 */} }))` のようにモック
- Next.js 環境:
  - `next/cache` は既にモック済み
  - App RouterのAPIルート/Server Actionsはロジックを **純粋なサービス** に抽出し、そのサービスをユニットテスト
- 外部API/Fetch:
  - `jest.setup.js` に簡易ポリフィルあり。各テストで `global.fetch = jest.fn()` を上書きし、ケースごとに戻り値を制御
- 時刻/タイマー:
  - `jest.useFakeTimers()` と `jest.setSystemTime()`（Date依存ロジックのテストで使用）

## APIルート/Server Actionの取り扱い

- 原則: ルート/アクション自体は薄い受け口に留め、ビジネスロジックはサービスに委譲
- ユニットテスト対象: 委譲先のサービス
- どうしてもルート関数をテストする場合は、`NextRequest` 相当を最小限モックして関数呼び出し（ただしこれは integration でカバーするのが推奨）

## アサーションと失敗理由

- アサーションは1テスト辺り1-3個程度にまとめ、意図が分かる説明変数や`describe/it`の日本語名を使用
- 失敗時に判別しやすい期待値・入力値をメッセージまたはテスト名に含める

## スナップショットの扱い

- コンポーネントの構造が安定した領域のみで最小限利用
- 視覚的な差分は E2E のビジュアル回帰（Playwright）側を主とする

## カバレッジ

- 収集: `npm run test:coverage`（単体テストのみ） / `npm run test:coverage:all`（単体+結合）
- 目標値（目安）: Lines/Branches/Functions 70%〜 80%（モジュールの重要度で調整）
- 重要ドメイン/ユースケースは 80% 以上を目安にレビュー

## 実行方法（開発者用）

- 単体テスト（ウォッチ）

```bash
npm run test:watch
```

- カバレッジを含めて実行

```bash
npm run test:coverage
```

- すべて（単体+結合）を対象にカバレッジ

```bash
npm run test:coverage:all
```

## 最小サンプル

- ドメイン関数（例）

```ts
// src/domains/example/add.ts
export function add(a: number, b: number): number { return a + b }
```

```ts
// src/__tests__/domains/example/add.test.ts
import { add } from '@/domains/example/add'

describe('add', () => {
  it('2つの数を加算して返す', () => {
    expect(add(1, 2)).toBe(3)
  })
})
```

- アプリケーションサービス（モック例）

```ts
// サービスはコンストラクタDIを想定
class ProjectService {
  constructor(private readonly repo: { findByName: (n: string) => Promise<null | { id: string }> }) {}
  async create(name: string) {
    const dup = await this.repo.findByName(name)
    if (dup) return { success: false, error: '同様のプロジェクト名が存在します。' }
    return { success: true, id: 'new-id' }
  }
}
```

```ts
// src/__tests__/applications/project-service.test.ts
import { jest } from '@jest/globals'

describe('ProjectService', () => {
  it('重複名のとき失敗を返す', async () => {
    const repo = { findByName: jest.fn().mockResolvedValue({ id: 'x' }) }
    const svc = new ProjectService(repo)
    await expect(svc.create('A')).resolves.toEqual({ success: false, error: '同様のプロジェクト名が存在します。' })
  })
})
```

- Reactコンポーネント（RTL例）

```tsx
// src/components/example/Counter.tsx
'use client'
import { useState } from 'react'
export function Counter() {
  const [n, set] = useState(0)
  return (
    <div>
      <p>count: {n}</p>
      <button onClick={() => set(n+1)}>inc</button>
    </div>
  )
}
```

```tsx
// src/__tests__/components/example/Counter.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from '@/components/example/Counter'

describe('Counter', () => {
  it('クリックでカウントが増える', async () => {
    render(<Counter />)
    await userEvent.click(screen.getByRole('button', { name: /inc/i }))
    expect(screen.getByText(/count: 1/)).toBeInTheDocument()
  })
})
```

## PRレビュー基準（抜粋）

- 重要なドメイン/ユースケースの変更には単体テストを必ず添付
- テストは「ビジネス上の意図」が読み取れる `describe/it` 名にする
- 依存はモックし、ユニットの責務にフォーカス
- UIはユーザー観点の振る舞いを検証（内部実装依存のテストは避ける）

## よくあるFAQ

- Q: Server Actions をどうテストしますか？
  - A: ロジックをサービスに抽出し、サービスをユニットテスト。Server Action 自体は薄く保ち、必要なら integration で補う。
- Q: Prismaを使う処理は？
  - A: Unitでは `@/lib/prisma/prisma` をモックし、メソッドを `jest.fn()` で差し替え。実際のDBは結合/E2Eで検証。
