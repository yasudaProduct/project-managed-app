# 計画書: ganttv3 のコンポーネント設計見直し・リファクタリングとテスト（コンポーネント/E2E）導入

## 1. 背景と目的

### 解決したいこと
`src/components/ganttv3/` 配下のガントチャート機能に対して、**コンポーネントテストとE2Eテストを導入**し、回帰を検知できる状態にする。
ただし現状のコンポーネントは設計上の負債が大きく、テストを「そのまま被せる」と低品質・高コスト・脆いテストになる。

### 現状認識（調査結果サマリ）

**実装側**
- 実質エントリは `GanttV3Client.tsx`（1284行, props は `wbsId` のみ）。データ取得は **Next.js Server Actions**（`getGanttTasks` 等）に直結合。
- `GanttChart.tsx`（1365行）に描画・座標計算・ドラッグ3種・ズーム・スクロール同期が集中。
- 状態管理ライブラリは未使用。すべて `useState`/`useRef`（`GanttV3Client` だけで state 約15個）。
- **ビジネスロジック（クリティカルパス計算・座標変換・依存差分・循環検出）がコンポーネント内に埋没**しており、純粋関数として露出していない。
- jsdom 非対応 API（`ResizeObserver`/`scrollIntoView`/`wheel`/`getBoundingClientRect` 依存の座標計算）と `document` への直接イベント登録が多く、現状のままではコンポーネントテストが困難。

**テスト基盤（既設・流用可能）**
- ユニット/コンポーネント: **Jest + React Testing Library**（jsdom, babel-jest）。`src/__tests__/components/ganttv2/` に先行例あり。
- E2E/ビジュアル: **Playwright** 整備済み（`src/__tests__/e2e/`）。ただし対象は旧 gantt で **ganttv3 は未カバー**。
- CI（`.github/workflows/ci.yml`）: ユニット・統合は自動実行。**E2E は CI 未実行**（手動のみ）。
- `@/` パスエイリアスは tsconfig と全 Jest config で統一済み。

### このドキュメントのゴール
1. ganttv3 の **コンポーネント設計方針**を定める（Stage 1）。
2. 方針に沿って **ロジック切り出し → コンポーネントのリファクタリング**を行う（Stage 2〜3）。
3. **ユニット → コンポーネント → E2E** の順でテストを導入する（Stage 2〜5）。

### 進め方（決定事項 / ユーザー合意済み）
- **ロジック切り出しを最優先**する。
- **コンポーネント設計の精査とリファクタを、コンポーネントテスト導入の前に行う**。
- そのために **まずコンポーネント設計方針を立てる**（Stage 1）。
- スコープは **本番系 `GanttV3Client` のレンダリングツリー**に集中。旧 `wbs/[id]/ganttv3` 系や未使用の `EnhancedTableView`/`TableView`/`GanttView`/`TaskManager`/`Toolbar` は当面対象外（別途整理）。

---

## 2. 全体ロードマップ

| Stage | 内容 | 成果物 | テスト |
|---|---|---|---|
| 1 | **コンポーネント設計方針の策定** | [ganttv3-component-design-policy.md](../design/ganttv3-component-design-policy.md)（策定済み） | — |
| 2 | **純粋ロジック抽出 + ユニットテスト**（TDD） | `utils/` 純粋関数群 + テスト | Unit |
| 3 | **コンポーネント／hook リファクタ** | hook分離・コンテナ分離・コンポーネント分割 | （既存Unit維持） |
| 4 | **コンポーネントテスト導入** | RTL テスト + 共通テストユーティリティ | Component |
| 5 | **E2E テスト導入 + CI 方針決定** | Playwright ganttv3 spec | E2E |

- Stage 2 のロジック抽出は他の依存が少なく独立して進められるため**最初に着手**。
- Stage 3 のリファクタは Stage 1 の方針確定が前提。
- 各 Stage は独立 PR に分割可能。CLAUDE.md の **TDD 原則**（テスト先行→失敗確認→実装）に従う。

---

## 3. Stage 1: コンポーネント設計方針（たたき）

> 📌 本節を正式版として詳細化した **[ganttv3-component-design-policy.md](../design/ganttv3-component-design-policy.md)** を別途作成済み（Vercel React Best Practices に準拠、13原則＋アンチパターン早見表＋レビューチェックリスト）。以降はそちらを正とする。本節は概要。

リファクタとテストの判断基準となる設計原則。ここを合意してから Stage 3 を実施する。

### 3.1 レイヤリング（責務の分離）

ganttv3 を以下の層に明確化する。

```
[ Server Actions ]  ← データ取得・永続化（既存、変更しない）
        ↑
[ Data / Mutation hooks ]   useGanttData / useGanttMutations / useGanttDraftEditing
        ↑   ← Server Actions をここに閉じ込める（コンポーネントから直importしない）
[ Container コンポーネント ]  GanttV3Client（状態オーケストレーションのみ）
        ↑
[ Presentational コンポーネント ]  GanttChart / TaskBar / TimelineHeader / ...（propsドリブン）
        ↑
[ Pure utils ]   criticalPath / timelineGeometry / dependencyGraph / groupTasks ...（React非依存）
```

### 3.2 設計原則

1. **ビジネスロジックはコンポーネントに書かない**
   計算・変換・グラフアルゴリズムは `utils/` の純粋関数へ。React 非依存・副作用なし・入出力が型で閉じている状態にする（テストが jsdom 不要になる）。
2. **Server Actions はコンポーネントから直接呼ばない**
   データ取得・CRUD は custom hook（`useGanttData`/`useGanttMutations`）に集約。コンポーネントテストでは hook をモックするだけで成立させる（コンテナ/プレゼンテーション分離）。
3. **DOM 直叩き・グローバルイベント登録は custom hook に閉じ込める**
   ドラッグ・スクロール同期・wheel ズームは `useBarDrag`/`useScrollSync`/`useRowScale` 等に隔離。コンポーネント本体から `document.addEventListener` を消す。
4. **プレゼンテーショナルコンポーネントは props で完結**
   表示用コンポーネントは内部 fetch を持たず、props と最小の表示 state（hover 等）のみ。`React.memo` を効かせるためコールバックは安定参照で渡す。
5. **巨大コンポーネントを分割**
   1ファイル＝1責務を目安。`GanttChart` から行描画（`TimelineRow`/`TaskListRow`）・インライン編集（`InlineTaskEditPanel`）を分離。
6. **状態の凝集**
   相互に関連する複数 state（ドラフト編集の4state＋6ハンドラ等）は custom hook + `useReducer` に凝集し、`GanttV3Client` の state 数を削減。
7. **計算の単一情報源（SSOT）**
   グルーピングや座標系の二重計算（`GanttV3Client`/`GanttChart`/`TimelineHeader` での重複）を解消し、上位で一度計算して配布。

### 3.3 ディレクトリ構成（提案）

```
src/components/ganttv3/
  components/        # presentational（GanttChart, TaskBar, TimelineRow, InlineTaskEditPanel, ...）
  hooks/             # useGanttData, useGanttMutations, useGanttDraftEditing,
                     #   useBarDrag, useScrollSync, useRowScale, usePanelResize, useAutoExpandGroups
  utils/             # criticalPath, timelineGeometry, dependencyGraph, taskMapper,
                     #   diffDependencies, downloadBlob, groupTasks(既存), phase-colors(既存)
  GanttV3Client.tsx  # container
  gantt.ts           # 型定義（既存）
  index.ts           # barrel（既存）
```
※ 移動は段階的に行い、`index.ts` の再エクスポートで互換を保つ。

### 3.4 ⚠️ リファクタ時の鉄則
- **挙動を変えない**（pure refactor）。各リファクタ PR は機能差分ゼロを目標にする。
- 抽出した純粋ロジックには**抽出と同時にユニットテストを付ける**（TDD: 期待値テスト先行）。
- hook/コンポーネント分割は**小さい単位で**行い、その都度 `npm run build` / 既存テストでデグレ確認。

---

## 4. Stage 2: 純粋ロジック抽出 + ユニットテスト（最優先）

抽出と同時にテストを書く。jsdom 不要・低リスク・高 ROI。**criticalPath を最初に着手。**

| # | 抽出対象（現在地） | 抽出先 | テスト観点 |
|---|---|---|---|
| 2-1 | `calculateCriticalPath`（`GanttV3Client` 148–273） | `utils/criticalPath.ts` | FS/SS/FF/SF とラグ、前方計算・後方マーキング、循環/孤立タスク |
| 2-2 | 座標系 `dateToX`/`scaleMultiplier`/`chartWidth`（`GanttChart` 318–457, `TimelineHeader` 112–216 の重複） | `utils/timelineGeometry.ts` | 日付⇔X変換、scale別の列幅、境界日、二重実装の統一 |
| 2-3 | `wouldCreateCycle`（`DependencyEditModal` 247–260） | `utils/dependencyGraph.ts` | 循環依存検出 DFS |
| 2-4 | 依存差分計算（`GanttV3Client` 802–861 `handleSaveEdit` 内） | `utils/diffDependencies.ts` | 追加/変更/削除の差分判定 |
| 2-5 | `toWbsTask`（900–922）, TSVダウンロード（616–639） | `utils/taskMapper.ts` / `utils/downloadBlob.ts` | マッピング、Blob生成の局所化 |
| 2-6 | `groupTasks.ts`（既に純粋・抽出済み） | 既存 | グルーピング/ソート/色割り当て（テスト追加のみ） |
| 2-7 | `getWeekNumber`・ヘッダ生成（`TimelineHeader` 38–216） | `utils/timelineHeaders.ts` | 週番号、scale別ヘッダ配列 |

**効果**: 2-1 の抽出で `useCallback` 依存連鎖が解消され、後続の hook 化（Stage 3）の見通しが良くなる。

---

## 5. Stage 3: コンポーネント／hook リファクタ

§3 の方針に沿って実施。挙動不変。優先度順。

### 高
- **`useGanttData` / `useGanttMutations` 抽出**（`GanttV3Client` の Server Actions 結合・楽観更新/ロールバック）→ コンテナ/プレゼンテーション分離。
- **`useGanttDraftEditing` 抽出**（ドラフト編集 4state + 6ハンドラ、`useReducer` 化）。

### 中
- **ドラッグ系 hook 化**: `useBarDrag` / `usePanelResize` / `useRowScale`（`GanttChart` の `document` 直登録を隔離）。ドラッグ中の最新 `tasks` は `useRef` 参照にして依存配列から外す。
- **`useScrollSync` 抽出**（timeline/taskList 縦スクロール同期）。
- **`TimelineHeader` のヘッダ生成を `scrollLeft` 非依存の `useMemo` に**（スクロール時の再計算を解消）。

### 低
- **`columns` 定義を `taskTableColumns.tsx` ファクトリへ**（`GanttV3Client` 935–1121）。`dependencies` 列の `tasks.find` を `Map` 化。
- **`GanttChart` から分割**: `InlineTaskEditPanel` / `TimelineRow` / `TaskListRow` + `React.memo`。`onDragStart` 等を安定参照化（ドラッグ中の全体再レンダ抑制）。
- **`TaskBar` を `MilestoneBar`/`TaskBarShape` に分割 + `React.memo`**。
- **`handleFitToScreen` の `setTimeout` を `requestAnimationFrame`/`useLayoutEffect` に**。

---

## 6. Stage 4: コンポーネントテスト（RTL）

リファクタ後の構造（hook 分離済み）を前提に、ganttv2 の既存パターンを踏襲。

### 6.1 共通テストユーティリティ（先に整備）
- **モックデータ factory**（`Task[]`/`Dependency[]`/`Category[]` を生成）。
- **Server Actions / hook モック**（`useGanttData`/`useGanttMutations` を差し替え）。
- **jsdom polyfill 集約**（`ResizeObserver`/`scrollIntoView` 等を共通 setup に）。

### 6.2 対象（優先順）
1. **表示系（props ドリブン）**: `TaskBar`/`TaskBarShape`, `TimelineHeader`, `GridLines`, `ViewSwitcher`, `DependencyArrows`。
2. **状態遷移**: `GanttV3Client` のビュー切替（gantt/table）、グループ化・ソート切替、選択状態、編集モード enter/save/cancel（hook をモック）。
3. **モーダル**: `DependencyEditModal` の入力→保存ハンドラ発火、循環検出によるバリデーション。

### 6.3 棲み分け
- ドラッグ・座標計算・スクロール同期は **jsdom で再現困難なため E2E に寄せる**。コンポーネントテストでは「ハンドラが正しい引数で呼ばれるか」までを検証。

---

## 7. Stage 5: E2E（Playwright）+ CI 方針

### 7.1 ganttv3 用 spec を新規作成（`src/__tests__/e2e/ganttv3-*.spec.ts`）
- 初期ロード（projects/[id]/ganttv3 表示）。
- **タスクバーのドラッグ移動 / 端リサイズ**（jsdom 不可・E2E 必須）。
- **スクロール同期**、ズーム in/out/fit。
- カテゴリ展開・折りたたみ。
- 依存関係の作成 → 矢印描画。
- （任意）ビジュアル回帰スナップショット。

### 7.2 既知の設定不備（着手時に修正）
- `playwright.config.ts` の `webServer.url`（3001）と `baseURL`（3000）の不一致を解消。

### 7.3 CI 方針（要決定 — §8 論点2/3）
- E2E を CI に載せるか、当面ローカル手動のままか。
- 載せる場合のデータ準備: 実 Postgres にシードして本番フローを通すか、Playwright の route intercept で Server Actions を軽量モックするか。

---

## 8. 未決事項（要相談）

| # | 論点 | 選択肢 | 影響 |
|---|---|---|---|
| 1 | リファクタの深さ | (A) 純粋ロジック抽出まで / (B) hook化・コンテナ分離まで / (C) コンポーネント分割まで全部 | テスト品質・工数 |
| 2 | E2E の CI 実行 | 載せる / 当面ローカル手動 | 実行時間・運用 |
| 3 | E2E のデータ準備 | 実DBシード / route intercept モック | 忠実度 vs 軽量さ |
| 4 | カバレッジ目標 | ganttv3 に数値目標を設けるか | 完了定義 |
| 5 | 旧/未使用コンポーネントの扱い | 当面放置 / この機会に削除整理 | スコープ |

---

## 9. 完了の定義（DoD・暫定）
- Stage 2: 抽出した純粋関数群にユニットテストがあり、`npm run test` がグリーン。
- Stage 3: リファクタ後も挙動不変（`npm run build` 成功・既存テスト維持）。
- Stage 4: 主要コンポーネント／状態遷移にコンポーネントテストがある。
- Stage 5: ganttv3 の主要ユーザーフローを E2E が通る。CI 実行方針が決定済み。
