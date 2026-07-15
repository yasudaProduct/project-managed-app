# EVM運用信頼性 調査レポート

- 調査日: 2026-07-15
- 対象: EVM機能を実プロジェクト運用（WBS同期・ガント編集・geppo実績取込）で使ったときの数値の信頼性
- 関連仕様: `docs/specs/02-evm.md`, `docs/specs/06-mysql-import.md`, `docs/plans/evm-progress-history-and-wbs-upsert.md`
- 実証テスト: `src/__integration_tests__/evm/evm-operational-flows.integration.test.ts`（本調査で追加）

---

## 1. 結論サマリ

**「diff同期＋毎月のgeppo取込」を守って運用する限り、EVMの現在値（PV/EV/AC/BAC/SPI/CPI）は概ね信頼できる。**
時系列（過去日）もスナップショット履歴により安定して再現される。設計自体（スナップショットによるas-of再構築、ACのwbsId直付けフォールバック、記録者単価によるコストAC）は堅牢に作られている。

ただし以下の条件を外れると数値が狂う。**特に(1)〜(3)は結合テストで実証済みの再現可能なバグ**。

| # | 事象 | 深刻度 | 状態 |
|---|------|--------|------|
| 1 | wbsId未設定の旧実績があるとgeppo再取込でAC二重計上（約2倍） | 高 | **実証済みバグ** |
| 2 | 月の実績を全0時間に訂正して再取込しても旧実績が消えない（AC過大） | 高 | **実証済みバグ** |
| 3 | 存在しない日（30日月のday31等）の実績が翌月1日へロールオーバーし、再取込のたびに増殖 | 中 | **実証済みバグ** |
| 4 | 「洗い替え」同期でEVM過去時系列の履歴が全消去され再現不能になる | 高 | 仕様（ダイアログに警告あり） |
| 5 | タスクNo採番変更でカードEV=0に落ち、時系列と食い違う | 中 | 実証済みの設計制約 |
| 6 | Excel進捗列が空のまま同期すると進捗0リセットでEVが消える | 中 | 実証済みの設計制約 |
| 7 | geppo未取込だと進捗があってもカードEV=0（SPI=0・critical表示） | 中 | 実証済みの設計制約 |
| 8 | geppo取込の10,000件上限超過分が「削除されたまま再作成されない」（AC欠損） | 高(大規模時) | コード上確認 |

---

## 2. 運用パターンの洗い出し

EVMの入力（PV/EV/BAC=タスク・スナップショット、AC=WorkRecord）を変化させる操作の全経路。

| # | 運用パターン | 経路 | EVMへの影響 |
|---|-------------|------|------------|
| P1 | WBS修正 → mysql.wbs同期（**diff/差分**） → EVM確認 | インポートジョブ(`WbsImportJobButtons`) → `WbsSyncApplicationService.syncDiff` | タスクupsert＋soft-delete＋**スナップショット追記**。PV/EV/BAC即変化、履歴保全 |
| P2 | WBS修正 → mysql.wbs同期（**replace/洗い替え**） → EVM確認 | 同上 → `replaceAll` | タスク物理削除＋再作成、**スナップショット全消去**、WorkRecord.taskIdがnull化 |
| P3 | ガントからWBS修正 → EVM確認 | ガントUI → `updateTask` server action → `TaskApplicationService.updateTask` | YOTEI期間/工数・進捗・状態のみ更新（KIJUN不変）。**手動スナップショット(syncLogId=null)追記** |
| P4 | タスクテーブル/モーダルから修正 → EVM確認 | P3と同一のserver action | P3と同じ |
| P5 | 実績記入 → mysql.geppo取込（月次/全期間） → EVM確認 | インポートジョブ or cron(`run-geppo-import.sh`) → `GeppoImportApplicationService.executeImport`（**常にreplaceモード**） | WorkRecordを「ユーザー×WBS×期間」でdelete→insert。AC変化・EVゲート解除・実績開始/終了日変化 |
| P6 | 進捗履歴の訂正 → EVM確認 | `/wbs/[id]/progress-history` → `updateProgressSnapshot` | 過去スナップショットのprogressRate/statusのみ遡及訂正（工数・日付・単価は訂正不可） |
| P7 | プロジェクト設定変更 → EVM確認 | 設定タブ → `updateEvmSettings` | 進捗測定方式・予測方式・バッファ換算・PV按分（暦日/営業日）・しきい値が全期間に即時反映（履歴には非依存） |
| P8 | タスク削除（画面から） | `deleteTask` | 物理削除＋**tombstoneスナップショット**（以降の寄与0、ACは維持） |
| P9 | 組み合わせ順序 | 例: taskNo変更→geppo再取込、WBS同期→geppo取込の順序 | taskNo変更後はgeppo再取込まで実績が旧taスクに残る等、過渡的不整合あり |

**このうちEVMが「履歴つきで」正しく動くのは P1/P3/P4/P5/P6/P8。P2（洗い替え）は履歴を破壊する。**

---

## 3. 実証済みバグ（結合テストで再現）

`src/__integration_tests__/evm/evm-operational-flows.integration.test.ts` の `it.failing` テストが「あるべき挙動」を記述しており、現行実装では失敗する（=バグの実在確認）。修正後に `failing` を外すこと。

### バグ1: wbsId未設定の旧実績とgeppo再取込でAC二重計上【深刻度: 高】

- 再現: `taskId`あり・`wbsId`なしのWorkRecord（2026-05-26のwbsId列追加以前のデータ、`prisma/seed.ts`経由、手動登録など）が存在する状態で同月をgeppo取込。
- 原因: AC集計は `OR: [{task:{wbsId}}, {wbsId}]` で旧行を拾う（`src/infrastructures/evm/wbs-evm-repository.ts:188-191`）が、replace時の削除は `wbsId IN (...)` のみで旧行を消せない（`src/infrastructures/work-record/work-record-repository.ts:127`）。取込は必ずwbsIdを付けて再作成するため、**旧行＋新行の両方がACに乗り約2倍になる**。
- 検証値: 8h の実績が再取込後 **16h** になる。
- 修正案: 削除条件をAC集計と同じ `OR: [{wbsId: {in}}, {task: {wbsId: {in}}}]` に揃える。あわせて `work_records` に一意制約（例: `@@unique([userId, date, taskId, wbsId])` 相当）の導入を検討。

### バグ2: 月の実績を全0時間に訂正して再取込しても旧実績が残る【深刻度: 高】

- 再現: ある月の実績6hを取込→geppo側で当月全日0hに訂正→再取込。
- 原因: 削除対象ユーザーが「変換後WorkRecord（>0h）を持つユーザー」に限定される（`src/applications/geppo-import/geppo-import-application-service.ts:190`）。全日0のユーザーは削除対象から漏れる。
- 検証値: 訂正後もACが **6h のまま残る**。
- 修正案: 削除対象ユーザーを「対象geppo行のMEMBER_ID全員（マッピング成功者）」にする。

### バグ3: 存在しない日の実績が翌月へロールオーバーし増殖【深刻度: 中】

- 再現: 30日月（例: 11月）のgeppo `DAY31` に値が入った状態で月次取込を2回。
- 原因: 日次展開が1〜31日固定ループ（同 `:320`）で、`Date.UTC(2025,10,31)`は**12/1に繰り上がる**。replaceの削除範囲は当月内のみなので、12/1のレコードは削除されず**再取込のたびに1件ずつ増える**。
- 検証値: 2回取込後、12/1に**2件**（5h×2）。
- 修正案: 月の実日数を超える日はスキップ（またはエラー計上）。

---

## 4. 設計上のトラップ（バグではないが運用者が誤解する挙動）

### T1. EVゲート: 実績(WorkRecord)が無いタスクはカードのEV=0

- ライブ計算のEVは `actualStartDate`（= そのタスクのWorkRecord最小日付。`src/infrastructures/wbs/wbs-query-repository.ts:41-42`）でゲートされる（`src/domains/evm/task-evm-data.ts:93`）。
- 帰結: **「WBS修正→wbs同期→EVM確認」だけ（geppo未取込）だと、進捗率が入っていてもカードのEVは0、SPI=0、ヘルスはcritical**。一方、時系列はスナップショットの直接EV（ゲートなし）でEV>0を示すため、**カードとグラフ末尾が食い違う**。
- 運用対処: EVM確認前に必ずgeppo取込を行う。カード側に「実績未取込」を示すUI（後述 UI-1）が望ましい。

### T2. 洗い替え（replace）同期は履歴を破壊する

- `taskProgressSnapshot.deleteMany({wbsId})` で履歴全消去＋タスク物理削除でWorkRecord.taskIdがSetNull（`src/infrastructures/task-repository.ts:522-558`）。
- 帰結: 過去日の時系列が「現在のタスク状態」でのライブ再計算に置き換わり、**過去のSPI/CPI推移が事実上捏造値になる**。フェーズ別・担当者別のAC内訳も全額「未紐付け・削除済み」行へ。wbsId列が無い旧実績は**ACから完全消失**。
- 確認ダイアログには警告が明記済み（`src/components/wbs/wbs-import-job-buttons.tsx:130-140`）。**通常運用はdiff一択**。
- 補足: `TaskStatusLog` を書き込む機能が将来有効になると、ログが1件でもあるタスクの物理削除がFK Restrictで失敗し洗い替え自体がロールバックする（現状プロダクションコードにTaskStatusLogの書き込み箇所は無いため顕在化していない）。

### T3. タスクNoの採番変更 = 別タスク扱い（履歴分断）

- diff同期はtaskNoが同一性キー。採番変更すると旧taskNoはtombstone・新taskNoは新規taskId。
- 帰結（結合テストで実証）: 旧タスクの実績は新タスクに紐付かないため**カードEVは0に落ちる**が、時系列as-ofは新スナップショットでEVを示し**両者が食い違う**。ACのWBS合計は維持されるが、タスク別内訳は「未紐付け・削除済み」へ。次回geppo取込で新taskIdに再紐付けされるまで過渡的不整合が続く。
- 運用対処: taskNoの採番変更は原則しない。やむを得ず変更したら直後にgeppo再取込。

### T4. Excelの進捗列が空だと進捗0リセット

- `applySyncDiff` は `progressRate ?? 0` で明示リセット（`src/infrastructures/task-repository.ts:465`）。担当者・フェーズも同様に「空=クリア」。
- 帰結（実証）: Excel側で進捗列を消す/入れ忘れると**EVが急落し、その0%がスナップショット履歴にも刻まれる**（訂正は進捗履歴画面で可能）。
- これは「Excelが唯一の真実源」という設計判断。アプリ側（ガント）で直した進捗・予定も次回diff同期でExcel値に巻き戻る点も同じ。

### T5. EVの母数は予定工数（YOTEI）、BACは基準工数（KIJUN）

- EV = 予定工数 × 進捗率（`src/domains/evm/task-evm-data.ts:96-102`）。予定工数を増やすと**過去に遡ってEVが増える**（現在カード。時系列はスナップショットで固定）。
- EV > BAC（予定>基準のとき進捗100%で発生）、完了率>100% が起こり得る（仕様書 `docs/specs/02-evm.md` §10 に明記）。
- また、UI作成タスクはKIJUNを持たないため予定変更でBACも動くが、Excel由来タスクはBAC固定 — **タスクの出自でBACの挙動が変わる**。

### T6. KIJUN工数0の扱いがライブとスナップショットで不一致

- ライブ読み出しは `kosu ? Number(kosu) : null` で**0をnull化**し、BACがYOTEIへフォールバック（`src/infrastructures/wbs/wbs-query-repository.ts:103` + `src/infrastructures/evm/wbs-evm-repository.ts:46`）。
- スナップショットは「明示的な基準0」を尊重（`src/applications/task/progress-snapshot-input-builder.ts:23-24`）。
- 帰結: 基準工数0のタスクがあると、**現在カードBACと時系列末尾BACが食い違う**。

### T7. その他の理論上のリスク（コード上確認、未実証）

| 項目 | 内容 | 場所 |
|------|------|------|
| 10,000件上限 | geppo取込は1回10,000件で打ち切り。replaceは先に削除するため**超過分が消えたまま**になる | `geppo-import-application-service.ts:282` |
| ユーザー前方一致 | `email.startsWith(MEMBER_ID)` で短いIDが別人に誤マップ→別人単価でコストAC | `user-mapping-service.ts:21-23` |
| WBS名完全一致 | geppo.PROJECT_ID ↔ wbs.name。表記揺れで丸ごと未マップ（警告のみ）、同名WBSは先勝ち | `project-mapping-service.ts:25` |
| 単価フォールバック | WBS担当者に未登録のユーザーの実績は一律¥5,000で金額AC計算 | `wbs-evm-repository.ts:217` |
| 「分単位」誤記 | `geppo-import-result.ts:19,27` のコメントが分単位と誤記（実装は時間）。将来の/60混入地雷 | 同左 |
| TZ | 保存・集計ともUTC暦日で統一済み（Issue #48対応済み）。サーバーTZをUTC以外にした場合の表示ズレのみ注意 | `date-util.ts` ほか |
| mergeモード | `bulkUpsert` はtaskId/wbsIdがundefinedだと条件から外れ誤上書きし得るが、**現状UI/バッチから到達しないデッドコード** | `work-record-repository.ts:80-104` |

---

## 5. 当面の運用ルール（推奨）

1. **同期は常にdiff（差分）**。洗い替えは「履歴を捨てて作り直す」意思決定のときのみ。
2. **EVM確認の前に geppo取込 → wbs同期 の順で最新化**し、ページを再読み込みする（インポート後にEVMは自動更新されない）。
3. taskNo（WBS_ID）の**採番変更をしない**。した場合は直後にgeppo再取込。
4. Excel側の進捗・担当・日付列を**空にしない**（空=クリアとして同期される）。
5. wbsId未設定の旧WorkRecordが残っていないか一度点検する（バグ1の火種）。`SELECT count(*) FROM work_records WHERE "wbsId" IS NULL AND "taskId" IS NOT NULL;`
6. 月次実績の訂正で「全0化」した場合は、当該ユーザー・当月のWorkRecordを手動確認（バグ2）。
7. コストモードを使う場合、実績を記録し得る全ユーザーをWBS担当者（単価つき）に登録する。

---

## 6. UI/UX 改善提案（運用者=週次でEVMを見るPM目線）

優先度順。

| # | 提案 | 根拠 |
|---|------|------|
| UI-1 | **KPIカード（SPI/CPI/健全性/予測完了日）を最上部へ**。現在は最下部（`evm-dashboard.tsx:439`）でスクロールしないと見えない | 週次レビューの最重要情報 |
| UI-2 | **「実績未取込」警告**: AC=0 かつ 進捗>0 のとき「geppo未取込のためEV/SPIが過小です」をカードに表示（T1対策） | カードEV=0の誤解が最も危険 |
| UI-3 | **インポート完了→EVM自動更新**（またはEVMタブに更新ボタン＋最終取込日時表示）。現在はコントロール変更かリロードでしか再取得されない（`evm-dashboard.tsx:84-94`） | 古い数字を見て意思決定するリスク |
| UI-4 | **`/wbs/[id]` にもEVMタブを出す**。現在 `showEvm=true` は `/projects/[id]` のみ（`src/app/wbs/[id]/page.tsx:53`） | 発見性 |
| UI-5 | **SPI/CPIバー・内訳表の色しきい値を設定値に連動**。バッジは設定値（既定90/80%）だがバーと内訳は1.0/0.9ハードコード（`evm-metrics-card.tsx:208-212`, `evm-breakdown-table.tsx:42-47`）で表示が矛盾する | 設定変更が反映されない |
| UI-6 | **チャート凡例のPV_BASE表記修正**: 「当初計画価値 (PV)」と「計画価値 (PV)」が両方(PV)表記（`evm-chart.tsx:135,145`） | 当初/現行計画の混同 |
| UI-7 | **予測方式(forecastMethod)をダッシュボードから切替可能に**（現在はプロジェクト設定のみ。actionは受け取れるがUIが渡していない） | EAC/ETCの前提を切り替えて見たい |
| UI-8 | **既定間隔を週次に**（UI既定はdaily、server actionのzod既定はweeklyで乖離。全期間×日次は点が多く重い） | 性能・視認性 |
| UI-9 | **金額の丸め統一**: カード/チャート/時系列は丸めなし、内訳とCSVは`Math.round`（`evm-breakdown-table.tsx:34`, `evm-dashboard.tsx:162`）で桁が食い違う | 数字の不一致は信頼を損なう |
| UI-10 | **取込結果に削除件数を表示**: replaceの`deletedCount`がジョブ結果に出ないため消えすぎ/消えなさすぎに気づけない | バグ1・2の検知手段 |
| UI-11 | 進捗履歴訂正画面の**列日付キーをUTC基準に**（現在ローカルTZの`getFullYear/getMonth/getDate`。EVM本体はUTC暦日で、非JST環境で1日ズレ得る） | 整合性 |
| UI-12 | EAC/ETCカードの**空ツールチップに説明を入れる**（`evm-metrics-card.tsx:342,360`） | 指標の意味説明 |

軽微なコード修正候補:
- `revalidatePath('/wbs/${wbsId}/gannt')` のタイポ（正: `gantt`）: `src/app/wbs/[id]/actions/wbs-task-actions.ts:133`
- `TaskProgressCalculator.calculateEffectiveProgress` の `console.log` 残骸: `src/domains/task/task-progress-calculator.ts:45-48`
- `Task.updateYotei` の `console.log` 残骸: `src/domains/task/task.ts:146`

---

## 7. 追加したテスト

`src/__integration_tests__/evm/evm-operational-flows.integration.test.ts`（13ケース、実DB使用）

- **フロー1（WBS同期→EVM）**: EVゲート（実績なし→EV0）、実績投入でEV解除、再同期の履歴保全（as-of再現）、進捗空リセット、taskNo採番変更のカード/時系列乖離
- **フロー2（ガント編集→EVM）**: 手動スナップショット記録（syncLogId=null）、予定工数変更でもBAC不変・過去時系列固定
- **フロー3（geppo取込→EVM）**: 取込→AC/EV反映、再取込の冪等性（正常系）、WBS_NO不一致実績のwbsId直付け計上
- **既知バグ文書化（`it.failing`）**: バグ1（AC二重計上）、バグ2（0時間訂正の残存）、バグ3（day31ロールオーバー増殖）

実行: `npm run test:integration -- --testPathPattern=evm-operational`

### 今後のテスト拡充候補

- 洗い替え(replace)後にEVM時系列がライブ再計算へ落ちることのend-to-end検証
- KIJUN工数0のライブBACとスナップショットBACの乖離（T6）
- geppo取込10,000件上限の欠損（T7）
- Playwright E2E（EVMダッシュボード表示・オプション切替・CSV出力）— 現状E2Eは未整備のためセットアップから必要

---

## 8. 修正推奨バックログ（優先度順）

1. **バグ1**: replace削除条件を `OR: [{wbsId IN}, {task: {wbsId IN}}]` に拡張（+ `work_records` の一意キー導入検討）
2. **バグ2**: 削除対象ユーザーを「対象geppo行のMEMBER_ID全員」に変更
3. **バグ3**: 月の実日数超の日をスキップ
4. geppo取込の10,000件上限をページング処理に（またはバリデーションで打ち切り検知をエラー化）
5. ジョブ結果に deletedCount/skippedCount を表示（UI-10）
6. UI-1〜UI-6（表示系の即効改善）
7. `geppo-import-result.ts` の「分単位」誤記修正
8. KIJUN工数0のnull化（ライブ/スナップショット不一致、T6）の解消
