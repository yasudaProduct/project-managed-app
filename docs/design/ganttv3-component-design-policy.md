# ganttv3 コンポーネント設計方針

このドキュメントは、`src/components/ganttv3/` 配下のリファクタリングとテスト導入に先立ち、目指すべきコンポーネント設計の原則を定める。
リファクタ（[ganttv3-refactoring-and-testing.md](../plans/ganttv3-refactoring-and-testing.md) の Stage 1）の判断基準であり、以降の新規コード・レビューの規範とする。

原則は **Vercel React Best Practices**（`.claude/skills/vercel-react-best-practices`、70ルール）を根拠とし、各原則に対応するルールID（例: `rerender-no-inline-components`）を併記する。

---

## 1. 目的とスコープ

### 目的
- ganttv3 を「テスト可能・高パフォーマンス・責務が分離された」構造にするための設計指針を共有する。
- ドラッグ・スクロール・大量タスク描画という、このコンポーネント特有の負荷に耐える設計を明文化する。

### スコープ
- 対象: 本番系 `GanttV3Client` のレンダリングツリー（`GanttChart` / `TaskBar` / `TimelineHeader` / `GridLines` / `DependencyArrows` / `DependencyEditModal` / `TaskTable` / `utils/*`）。
- 対象外: 旧 `wbs/[id]/ganttv3` 系、未使用の `EnhancedTableView`/`TableView`/`GanttView`/`TaskManager`/`Toolbar`。

---

## 2. 前提（技術スタックと重要な制約）

| 項目 | 値 | 設計への影響 |
|---|---|---|
| React | 19.x | `useDeferredValue` / `useTransition` 利用可。`useEffectEvent` も利用可（後述） |
| Next.js | 15.5（App Router） | データ取得は Server Actions（Client から直接呼ばない方針） |
| **React Compiler** | **未導入**（`babel-plugin-react-compiler` なし） | **手動メモ化が必須**。`memo`/`useMemo`/`useCallback` を明示的に使う。安定参照を自分で管理する |
| 状態管理ライブラリ | なし（`useState`/`useRef`） | 状態の凝集は custom hook + `useReducer` で行う |

> ⚠️ **React Compiler が未導入である点が最重要。** Vercel ルールの多くは「Compiler 有効なら自動最適化されるため手動メモ化不要」と注記するが、本プロジェクトは**該当しない**。よって本方針では手動メモ化・安定参照を明示的な義務とする。将来 Compiler を導入する場合は本方針のメモ化義務を見直す。

---

## 3. レイヤー構成（責務の分離）

ganttv3 を以下の5層に分離する。**下の層は上の層を知らない**（依存は一方向）。

```
[ Server Actions ]               データ取得・永続化（既存。変更しない）
        ▲
[ Data / Mutation hooks ]        useGanttData / useGanttMutations / useGanttDraftEditing
        │                        ── Server Actions をここに閉じ込める ──
        ▲
[ Container ]                    GanttV3Client（状態オーケストレーションのみ）
        ▲
[ Presentational components ]    GanttChart / TaskBar / TimelineRow / InlineTaskEditPanel ...
        │                        ── props で完結。内部 fetch を持たない ──
        ▲
[ Pure utils ]                   criticalPath / timelineGeometry / dependencyGraph / groupTasks ...
                                 ── React 非依存・副作用なし ──
```

| 層 | 責務 | やってはいけないこと |
|---|---|---|
| Pure utils | 計算・変換・グラフアルゴリズム | React import、副作用、DOM 参照 |
| Presentational | props を受けて描画、最小の表示 state（hover 等） | Server Actions 呼び出し、データ fetch |
| Container | hook を束ね、子へ props を配る | 計算ロジックの直書き、巨大 JSX |
| Data/Mutation hooks | Server Actions の呼び出し、楽観更新/ロールバック | 描画 |

---

## 4. 設計原則

各原則に Vercel ルールIDと、ganttv3 の現状該当箇所（`file:line`）を併記する。

### 原則 1: ビジネスロジックはコンポーネントに書かない
計算・変換・グラフアルゴリズムは `utils/` の純粋関数へ出す。React 非依存にすることで jsdom 不要のユニットテストが書ける。

- 関連: `rerender-derived-state-no-effect`（派生値は state にせず render 中に算出）
- 現状の違反例:
  - `calculateCriticalPath`（`GanttV3Client.tsx` 148–273）→ `utils/criticalPath.ts`
  - 座標変換 `dateToX`/`scaleMultiplier`（`GanttChart.tsx` 318–457）→ `utils/timelineGeometry.ts`
  - `wouldCreateCycle`（`DependencyEditModal.tsx` 247–260）→ `utils/dependencyGraph.ts`

### 原則 2: 派生値は state にせず描画時に算出する
props/state から計算できる値を `useState` + `useEffect` で同期しない。render 中に算出する（余分な再レンダーと state ドリフトを防ぐ）。

- 関連: `rerender-derived-state-no-effect`
- 適用: グルーピング結果・クリティカルパス・表示用の整形値は `useMemo`（または素の計算）で派生させる。`useEffect` で `setState` して同期しているものがあれば撤廃。

### 原則 3: Server Actions はコンポーネントから直接呼ばない
データ取得・CRUD は custom hook（`useGanttData` / `useGanttMutations`）に集約する。コンポーネントテストでは hook をモックするだけで成立する（コンテナ/プレゼンテーション分離）。

- 現状の違反例: `GanttV3Client.tsx` 44–62 で Server Actions を直 import、各ハンドラ内で直呼び出し。

### 原則 4: コンポーネントを別コンポーネント内で定義しない
関数コンポーネントの内部で別コンポーネントを定義すると、毎レンダーで「別の型」とみなされ**毎回アンマウント→再マウント**される（state 喪失・input フォーカス喪失・スクロール位置リセット）。親変数へアクセスしたいだけなら **props を渡す**。

- 関連: `rerender-no-inline-components`（**impact: HIGH**）
- 適用: `GanttChart.tsx` のインライン編集パネル（829–945）や行描画（980–1114, 1183–1340）を外出しする際、**必ずトップレベルのコンポーネントとして定義**し props で値を渡す。テーブル列の `renderCell`（`GanttV3Client.tsx` 935–1121）も同様。

### 原則 5: 頻繁に変わる一時値は state ではなく ref に持つ
マウス座標・ドラッグ中のプレビューなど「毎フレーム変わるが UI 確定値ではない値」は `useRef` + 直接 DOM 操作（`node.style.transform`）で扱い、再レンダーを発生させない。

- 関連: `rerender-use-ref-transient-values`、`advanced-use-latest`
- 現状の違反例: ドラッグ中に `setDragPreview` がチャート全体を再レンダーし、全タスクバー・左リスト全行が再評価される（`GanttChart.tsx` バードラッグの `useEffect` 488–541）。
  - あるべき姿: ドラッグ中はプレビュー値を ref に保持し、対象バーの `transform` を直接更新。確定（mouseup）時にのみ `onTaskUpdate` で state 反映。

### 原則 6: メモ化と安定参照（React Compiler 未導入のため必須）
表示コンポーネントは `React.memo` で包み、親の頻繁な再レンダーから隔離する。`memo` を効かせるため、props として渡すコールバックは**安定参照**にする（インラインで新規関数を毎回作らない）。

- 関連: `rerender-memo`、`rerender-no-inline-components`
- 現状の違反例: `onDragStart={editMode ? handleBarDragStart : () => {}}`（`GanttChart.tsx` 1330）が毎レンダー新しい空関数を生成し、`TaskBar` の memo を無効化している。
  - あるべき姿: `noop` を定数化、またはハンドラを `useCallback` で固定。`TaskBar`/行コンポーネントを `memo` 化。

### 原則 7: 副作用は分割し、依存配列は最小化する
独立した処理を1つの `useEffect`/`useMemo` に詰め込まない。別々の依存を持つものは分割する（無関係な依存変化での再実行を防ぐ）。

- 関連: `rerender-split-combined-hooks`
- 適用: 初期ロードで3つの fetch を1 effect に詰めている箇所（`GanttV3Client.tsx` 282–294）や、フィルタ＋ソートの合体 memo は分割を検討。

### 原則 8: イベントハンドラは ref 経由で安定購読する
`document`/`window` へのイベント登録を伴う effect は、ハンドラを直接依存に入れると毎レンダーで再購読される。ハンドラを ref（または `useEffectEvent`）に逃がし、購読の effect 依存は `[]` または安定値のみにする。

- 関連: `advanced-event-handler-refs`、`advanced-use-latest`、`advanced-effect-event-deps`
- 現状の違反例: バードラッグの `useEffect` が `[columnWidth, scaleMultiplier, tasks, onTaskUpdate]` に依存し、**`tasks` が1件変わるたびリスナを貼り直す**（`GanttChart.tsx` 488–541）。最新 `tasks` は ref で参照し依存から外す。

### 原則 9: DOM 直叩き・グローバルイベントは custom hook に閉じ込める
ドラッグ・スクロール同期・wheel ズーム・列幅リサイズは専用 hook に隔離する。コンポーネント本体から `document.addEventListener` を排除し、テスト境界（hook のモック点）を作る。

- 切り出し対象 hook: `useBarDrag` / `usePanelResize` / `useRowScale` / `useScrollSync`。
- 現状: `GanttChart.tsx` 186–219（列幅）, 266–296（スクロール同期）, 299–315（wheel）, 460–541（バードラッグ）に散在。

### 原則 10: wheel / touch リスナーの passive 指定を意図的に行う
スクロール遅延を避けるため、`preventDefault()` を呼ばないリスナーは `{ passive: true }` にする。逆に**カスタムズーム等で `preventDefault()` が必要なリスナーは passive にしない**（明示的に非 passive とコメントを残す）。

- 関連: `client-passive-event-listeners`
- 適用: `GanttChart.tsx` 299–315 の `wheel` は Ctrl+wheel でズーム制御し `preventDefault` する想定なので**非 passive が正当**。ただし「なぜ非 passive か」をコメントで明示する。横スクロール専用のホイール処理を分離できるなら、そちらは passive にする。

### 原則 11: 繰り返しルックアップは Map 化する
同じキーでの `.find()` を繰り返す箇所は事前に `Map` を構築して O(1) にする。

- 関連: `js-index-maps`、`js-set-map-lookups`
- 現状の違反例: テーブル `dependencies` 列で `tasks.find` を行内で繰り返す（`GanttV3Client.tsx` 1043 付近）。`taskById = new Map(...)` を上位で1度構築して配布する。

### 原則 12: 計算の単一情報源（SSOT）
同じ計算を複数コンポーネントで重複実装しない。上位で1度計算し、結果を props で配る。

- 現状の違反例:
  - グルーピングを `GanttV3Client.tsx` 123 と `GanttChart.tsx` 337 で二重呼び出し。
  - スケール計算を `GanttChart.tsx` 429–436 と `TimelineHeader.tsx` 127–144 で重複。
  - → `utils/timelineGeometry.ts` / 上位 hook に集約して配布。

### 原則 13: 条件付きレンダーは三項演算子で（`&&` の落とし穴）
`count && <X/>` は `count` が `0` のとき `0` を描画してしまう。数値・可変長配列の length などを条件にする場合は三項 + `null` を使う。

- 関連: `rendering-conditional-render`
- 適用: タスク数・依存数・ラグ等の数値を条件にした表示箇所を点検。

---

## 5. パフォーマンス指針（ganttv3 特有）

### 5.1 ドラッグ中の再レンダー抑制（最重要）
- ドラッグ中の座標は **ref + 直接 DOM 更新**（原則 5）。state 更新は mouseup 時のみ。
- タスクバー・行は `React.memo` 化し、ドラッグ対象行のみ更新されるようにする（原則 6）。
- ハンドラは安定参照（原則 6）。

### 5.2 スクロール時の再計算抑制
- `TimelineHeader` のヘッダ生成は `scrollLeft` に依存させない。`useMemo([start, end, scale, columnWidth])` とし、`scrollLeft` は `transform` 適用のみに使う（現状 38–216 が毎スクロール再計算）。
- 関連: `rerender-use-ref-transient-values`（`scrollLeft` は ref 寄りの一時値）。

### 5.3 大量タスクの描画
- 縦に長いタスクリスト行に `content-visibility: auto` + `contain-intrinsic-size` を付け、画面外の layout/paint をスキップする。
- 関連: `rendering-content-visibility`（**impact: HIGH**）。
- 重いフィルタ/再構築が入力に追随する場合は `useDeferredValue` で入力応答性を確保（関連: `rerender-use-deferred-value`）。将来の仮想化（react-window 等）は本方針の延長線上で検討。

### 5.4 SVG（依存矢印）
- `DependencyArrows` の座標は小数精度を抑える（関連: `rendering-svg-precision`）。
- アニメーションさせる場合はラッパ `div` 側を animate する（関連: `rendering-animate-svg-wrapper`）。

### 5.5 レイアウト確定待ちの排除
- `setTimeout(..., 100)` でスクロール位置を合わせる箇所（`GanttChart.tsx` 600–636 の `handleFitToScreen`）は `requestAnimationFrame` / `useLayoutEffect` に置き換える。

---

## 6. 状態管理指針

- **凝集**: 相互依存する複数 state は custom hook + `useReducer` にまとめる。
  - 例: ドラフト編集の `editMode`/`draftTasks`/`isSavingEdit`/`tempDepIdRef` ＋ 6ハンドラ（`GanttV3Client.tsx` 641–877）→ `useGanttDraftEditing`（内部 `useReducer`）。
- **派生は state にしない**（原則 2）。クリティカルパス・グルーピングは派生値。
- **一時値は ref**（原則 5）。ドラッグプレビュー・スクロール位置・`tempDepIdRef` など。
- **Container の state を減らす**: `GanttV3Client` の state（現状約15個）を、データ系（`useGanttData`）・編集系（`useGanttDraftEditing`）へ移譲し、Container は「ビュー切替・選択・表示設定」程度に絞る。

---

## 7. ディレクトリ構成（目標）

```
src/components/ganttv3/
  GanttV3Client.tsx          # Container（状態オーケストレーションのみ）
  gantt.ts                   # 型定義（既存）
  index.ts                   # barrel（既存・互換維持）
  components/                # Presentational
    GanttChart.tsx
    TimelineHeader.tsx
    TimelineRow.tsx          # 新: 行描画（memo）
    TaskListRow.tsx          # 新: 左リスト行（memo）
    InlineTaskEditPanel.tsx  # 新: インライン編集（GanttChart から分離）
    TaskBar.tsx  TaskBarShape.tsx  MilestoneBar.tsx
    GridLines.tsx  DependencyArrows.tsx  DependencyEditModal.tsx  TaskTable.tsx
    ViewSwitcher.tsx  QuickActions.tsx  StyleCustomizer.tsx
  hooks/                     # Data / Mutation / Interaction hooks
    useGanttData.ts  useGanttMutations.ts  useGanttDraftEditing.ts
    useBarDrag.ts  useScrollSync.ts  useRowScale.ts  usePanelResize.ts
    useAutoExpandGroups.ts
  utils/                     # Pure（React 非依存）
    criticalPath.ts  timelineGeometry.ts  timelineHeaders.ts
    dependencyGraph.ts  diffDependencies.ts  taskMapper.ts  downloadBlob.ts
    groupTasks.ts  phase-colors.ts        # 既存
```

- 移動は段階的に行い、`index.ts` の再エクスポートで外部からの import 互換を保つ。
- 命名は `docs/03-coding-style.md` に従う（hook は `useX`、ハンドラは公開 `onX`／内部 `handleX`）。

---

## 8. アンチパターン早見表（現状 → あるべき姿）

| # | 現状（file:line） | 問題 | あるべき姿 | ルール |
|---|---|---|---|---|
| 1 | `calculateCriticalPath` がコンポーネント内（GanttV3Client 148–273） | テスト不可・依存連鎖肥大 | `utils/criticalPath.ts` の純粋関数 | 原則1 |
| 2 | ドラッグ中 `setDragPreview` で全体再レンダー（GanttChart 488–541） | 大量タスクで重い | ref + 直接 DOM 更新、mouseup で確定 | `rerender-use-ref-transient-values` |
| 3 | `onDragStart={... : () => {}}`（GanttChart 1330） | memo 無効化 | `noop` 定数 / `useCallback` | `rerender-no-inline-components` |
| 4 | バードラッグ effect が `tasks` 依存（GanttChart 488–541） | 毎更新で再購読 | 最新 tasks を ref 参照、依存から除外 | `advanced-event-handler-refs` |
| 5 | ヘッダ生成が `scrollLeft` 依存（TimelineHeader 38–216） | 毎スクロール再計算 | `useMemo`（scrollLeft 非依存）、transform のみ scrollLeft | `rerender-use-ref-transient-values` |
| 6 | `tasks.find` をセルで反復（GanttV3Client 1043 付近） | O(n²) | `Map` 化して配布 | `js-index-maps` |
| 7 | グルーピング/スケールの二重実装（Client 123 / Chart 337, Chart 429 / Header 127） | 不整合リスク・無駄計算 | 上位 hook / utils に SSOT 化 | 原則12 |
| 8 | Server Actions 直 import（GanttV3Client 44–62） | テスト時に全モック必須 | `useGanttData`/`useGanttMutations` | 原則3 |
| 9 | `setTimeout` でスクロール調整（GanttChart 623） | レイアウト確定待ちの不安定 | `requestAnimationFrame`/`useLayoutEffect` | 5.5 |

---

## 9. レビュー用チェックリスト

新規 ganttv3 コード・リファクタ PR は以下を満たすこと。

- [ ] 計算ロジックは `utils/` の純粋関数にあり、ユニットテストがある（原則1）
- [ ] コンポーネントは別コンポーネントを内部定義していない（原則4）
- [ ] 頻繁に変わる一時値は ref で扱い、不要な再レンダーを起こしていない（原則5）
- [ ] `memo` 対象に渡すコールバックは安定参照（インライン新規関数なし）（原則6）
- [ ] `document`/`window` への登録は custom hook 内に閉じている（原則9）
- [ ] wheel/touch の passive 指定が意図的（preventDefault する場合は非 passive とコメント）（原則10）
- [ ] 派生値を `useState`+`useEffect` で同期していない（原則2）
- [ ] 繰り返しルックアップは `Map`/`Set`（原則11）
- [ ] 数値条件のレンダーは三項演算子（原則13）
- [ ] Presentational は Server Actions を呼んでいない（原則3）

---

## 10. 計画との関係

- 本方針は [ganttv3-refactoring-and-testing.md](../plans/ganttv3-refactoring-and-testing.md) の **Stage 1（設計方針の策定）** の成果物。
- **Stage 2（純粋ロジック抽出）** は原則1・2・11・12 を、**Stage 3（hook/コンポーネントのリファクタ）** は原則3〜10 を実装に落とす。
- リファクタは**挙動不変（pure refactor）**を鉄則とし、抽出した純粋ロジックには同時にユニットテストを付ける（TDD）。

---

## 付録: 参照した Vercel ルール

| ルールID | impact | 本方針での反映 |
|---|---|---|
| `rerender-no-inline-components` | HIGH | 原則4・6 |
| `rendering-content-visibility` | HIGH | 5.3 |
| `rerender-use-ref-transient-values` | MEDIUM | 原則5、5.1、5.2 |
| `rerender-memo` | MEDIUM | 原則6 |
| `rerender-derived-state-no-effect` | MEDIUM | 原則1・2 |
| `rerender-split-combined-hooks` | MEDIUM | 原則7 |
| `rerender-use-deferred-value` | MEDIUM | 5.3 |
| `client-passive-event-listeners` | MEDIUM | 原則10 |
| `js-index-maps` / `js-set-map-lookups` | LOW-MEDIUM | 原則11 |
| `advanced-event-handler-refs` / `advanced-use-latest` | LOW | 原則5・8 |
| `client-event-listeners` | LOW | 原則9（必要時 `useSWRSubscription` 検討） |
| `rendering-svg-precision` / `rendering-animate-svg-wrapper` | LOW | 5.4 |
| `rendering-conditional-render` | LOW | 原則13 |

> メモ化系ルールは一般に「React Compiler 有効なら不要」と注記されるが、本プロジェクトは **Compiler 未導入**のため手動メモ化を義務とする（§2）。
