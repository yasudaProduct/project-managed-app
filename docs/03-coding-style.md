# コーディング規約（TypeScript/Next.js）

## 共通
- Strict TypeScript（`strict: true`）
- 関数/変数は意味のある命名。略語は避ける。
- 早期returnでネストを浅く。
- 例外は握りつぶさず、文脈あるメッセージで上位へ。

## ディレクトリ/レイヤ
- `src/app`（App Router）: ルート/ページ/サーバアクション
- `src/components`: 再利用コンポーネント（UI/複合）
- `src/applications`: ユースケース(アプリケーション)層
- `src/domains`: エンティティ/値オブジェクト、ビジネスロジック
- `src/infrastructures`:
- `src/lib`: 

## TypeScript
- パブリックAPI/エクスポートは明示的に型注釈
- 便利型よりドメイン型を優先し、意図を表現
- `experimentalDecorators`利用時はテストで担保

## React/Next.js
- フォームは`react-hook-form` + `zod`でバリデーション
- 非同期処理は`useQuery`等でデータ取得、ローディング/エラー状態を表示
- パフォーマンス: `useMemo/useCallback`の適切な利用、巨大配列は仮想化検討

## スタイル/Tailwind
- レイアウトは`flex/grid`を優先。
- クラス名は`clsx`/`tailwind-merge`で条件結合
- 変数化されたデザイントークン（`--primary`等）を活用

## エラーハンドリング/ログ
- 予期しうるエラーはユーザーに分かる形で通知
- インポート/ジョブ系は`import_jobs`/`import_job_progress`へ詳細を残す

## テスト
- 単体: 重要ロジックはユニットテスト必須
- 統合: アプリケーション層で主要ユースケースをカバー
- E2E: 主要シナリオと回帰箇所をPlaywrightで
