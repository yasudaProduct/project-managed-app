# タスクスケジューリング仕様書

## 1. 概要

本仕様書は、WBSのタスクに対して**基準日を起点に予定開始日・終了日を前詰めで試算する**スケジューリング機能を定義する。タスクの依存関係・担当者の稼働カレンダー・定常タスク・タスクのステータスを考慮し、現実的なスケジュールをシミュレートする。

> **重要な前提（スコープ）**
> 計算結果は **画面プレビューと TSV 出力までに留め、WBSタスクのDB（予定日程）には一切書き戻さない**。WBSへの予定日程の反映は MySQL/Excel インポート（[06: MySQLインポート](./06-mysql-import.md)）が本流であり、本機能は見積もり・確認のための**読み取り専用の試算**である。計算結果の手動調整（[§9.4](#94-手動調整)）もクライアント状態と読み取り専用の再計算のみで実現し、この前提を維持する。

> **関連仕様書との位置づけ**
> - [01: 営業日按分ロジック](./01-working-hours-allocation.md): 担当者の「いつ・何時間稼働できるか」（`AssigneeWorkingCalendar` / `CompanyCalendar`）を計算する。本機能はこれを稼働量の基盤として利用する。
> - 本仕様書（07）: その稼働量と依存関係を踏まえ、**タスクの開始日・終了日を前詰めで決定する**。

利用画面: WBS管理画面の「スケジュール」タブ、および専用ページ `/wbs/[id]/task-scheduling`。

---

## 2. 用語定義

### 基準日 (Baseline Date)
前詰めの起点となる日付。後述の3モードから選択する。完了済みタスクを除く全タスクは、この基準日以降にスケジュールされる。

### 前詰め (Forward Scheduling)
各タスクを「可能な限り早い日付」から順に配置する方式。担当者の稼働可能時間で工数を消化し、終了日を算出する。

### 定常タスク (Steady Task)
プロジェクト管理など、期間中ずっと一定の工数を消費し続けるタスク。タスク名が設定キーワードに**部分一致**するもの。前詰めの対象外とし、既存の予定期間（YOTEI）をそのまま使う。

### 依存関係 (Dependency)
タスク間の前後制約。種別は FS / SS / FF / SF の4種、遅延 `lag`（カレンダー日）を持つ。詳細は [§7.3](#73-依存制約)。

### 残工数 (Remaining Hours)
進行中タスクにおける `予定工数 − 実績工数`。進行中タスクはこの残工数のみを基準日以降に前詰めする。

### スキップ (Skip)
計算対象外として日程を算出しないこと。担当者未設定・予定工数未設定・定常タスクの期間未設定・循環依存のタスクが該当する。

---

## 3. 全体フロー（アーキテクチャ）

オニオンアーキテクチャに従い、以下の層で構成される。

```
[UI] SchedulingWorkbench (client)
  └─ calculateSchedule(wbsId, { baselineMode, baselineDateIso? })   ← Server Action
       └─ ISchedulingApplicationService.calculateSchedule()          ← アプリケーション層
            ├─ 各リポジトリからデータ収集
            ├─ toSchedulingTask: Task集約 → SchedulingTask に正規化
            ├─ SchedulingPreconditionService.check   （前提条件チェック）
            ├─ forwardSchedule                       （中核エンジン）
            └─ WorkloadCalculationService.calculateDailyAllocationsFromSchedule（負荷按分）
       ↓ returns プレーンDTO（日付はISO8601文字列）
  ├─ SchedulingGanttPreview      （ganttv3 の GanttChart を editMode=false で再利用）
  ├─ AssigneeGanttChart          （previewWorkloads props で負荷表示）
  └─ TSVダウンロード
```

| 層 | 主なファイル |
| --- | --- |
| ドメイン（エンジン） | `src/domains/task-scheduling/forward-scheduler.ts` ほか同ディレクトリ |
| ドメイン（依存・カレンダー） | `src/domains/task-dependency/`, `src/domains/calendar/` |
| アプリケーション | `src/applications/task-scheduling/scheduling-application-service.ts` |
| Server Action | `src/components/task-scheduling/scheduling-actions.ts` |
| UI | `src/components/task-scheduling/scheduling-workbench.tsx` ほか |
| 設定 | `project_settings.schedulingSettings`（Json列） |

---

## 4. 設定 (schedulingSettings)

プロジェクト単位の設定 `project_settings.schedulingSettings`（Json）に保持する。型は `src/types/scheduling-settings.ts` の `SchedulingSettings`。

| フィールド | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `steadyTaskKeywords` | `string[]` | `[]` | 定常タスク判定キーワード（タスク名の部分一致） |
| `consumeSteadyTaskCapacity` | `boolean` | `false` | 定常タスクが担当者の稼働を消費するか |
| `steadyDailyHoursMode` | `'PRORATE' \| 'FIXED'` | `'PRORATE'` | 定常タスクの日次消費量の決定方式 |
| `steadyFixedHoursByKeyword` | `Record<string, number>?` | なし | FIXED時のキーワード別日次固定時間(h/日) |

- 永続化された Json は `parseSchedulingSettings()` で正規化される（数値以外の固定値は除外、不正な mode は `PRORATE` にフォールバック）。
- 編集UIは WBS管理画面「設定」タブ（`src/components/wbs/project-settings.tsx`）。FIXED選択時のみキーワード別の固定時間入力欄が表示され、**現在のキーワードに存在するキーのみ**保存される（キーワード削除で固定値も連動して落ちる）。空欄のキーワードは按分（PRORATE）にフォールバックする。

---

## 5. 基準日の決定

`resolveBaselineDate(mode, projectStartDate, now, customIso?)`（`baseline-resolver.ts`）で決定する。

| モード | 基準日 |
| --- | --- |
| `PROJECT_START`（既定） | プロジェクト開始日 `project.startDate` |
| `TODAY` | 実行日の0時（ローカル） |
| `CUSTOM` | 指定された ISO8601 日付（未指定はエラー） |

UIの基準日が非稼働日（土日祝等）の場合でも、実際の各タスク開始は担当者カレンダー上の翌営業日へ自動的に丸められる（[§7.4](#74-開始日の丸めと工数消化)）。

---

## 6. タスクのステータス別扱い

`forwardSchedule` は各タスクをステータスと定常判定で分類する。出力 `ScheduledTask` の `note`（備考コード）で結果種別を表す。

| 区分 | 条件 | 扱い | `note` | `skipped`/`fixed` |
| --- | --- | --- | --- | --- |
| 担当者未設定 | `assigneeId` が null | 計算対象外 | `NO_ASSIGNEE` | skipped |
| 工数未設定 | 非定常で `yoteiKosu` が null/0以下 | 計算対象外 | `NO_YOTEI_KOSU` | skipped |
| 完了 | `status = COMPLETED` | **実績日程で固定**（前詰めしない） | `COMPLETED_FIXED` | fixed |
| 進行中 | `status = IN_PROGRESS` | **残工数**を基準日以降に前詰め | `IN_PROGRESS_REMAINING` | — |
| 未着手 | `status = NOT_STARTED` 等 | フル工数を前詰め | `NORMAL` | — |
| 定常 | タスク名がキーワードに部分一致 | **前詰めせずYOTEI期間のまま** | `STEADY_FIXED_PERIOD` | — |
| 定常・期間なし | 定常だが YOTEI 期間が無い | 計算対象外 | `STEADY_NO_PERIOD` | skipped |
| 循環依存 | 依存の循環に含まれる | 計算対象外 | `CYCLIC` | skipped |
| 計算上限超過 | 全日稼働0等で消化不能 | 打ち切り | `SCHEDULE_OVERFLOW` | — |

- **完了タスクの固定日程**: `実績開始日 ?? 予定開始日` 〜 `実績終了日 ?? 予定終了日`、工数は `実績工数 ?? 予定工数`。実績は `WorkRecord` から導出（`getJissekiStart/End/Kosus`）。
- **進行中の残工数**: `max(0, 予定工数 − 実績工数)`。残0なら開始=終了=基準日相当、工数0で配置。

---

## 7. スケジューリングアルゴリズム

中核は `forwardSchedule(input)`（`forward-scheduler.ts`）。入力はタスク・依存・担当者カレンダー・標準稼働時間・オプション。処理は3フェーズ。

### 7.1 フェーズA: 分類と完了固定
全タスクを走査し、担当者未設定 → `NO_ASSIGNEE` skip、完了 → 実績で固定、非定常で工数未設定 → `NO_YOTEI_KOSU` skip、に振り分ける。

### 7.2 フェーズB: 定常タスクの先置き
定常タスク（キーワード部分一致, `isSteadyTask`）を YOTEI 期間のまま結果に**先置き**する（依存の先行として参照可能にするため）。期間が無ければ `STEADY_NO_PERIOD` skip。

`consumeSteadyTaskCapacity = true` の場合、定常タスクが期間中の各稼働日に消費する工数を担当者ごとの消費マップ `consumed[assigneeId][YYYY-MM-DD]` に加算する。日次消費量は次で決まる:

```
steadyDailyHoursMode = FIXED かつ steadyFixedHoursByKeyword に一致キーワードあり
  → その固定値(h/日)
それ以外（PRORATE / 固定値未設定）
  → 予定工数 ÷ 期間内の稼働日数（按分）
```

### 7.3 依存制約
通常タスクをトポロジカル順（`topological-sort.ts`, Kahn法）に処理する。循環ノードは末尾に回し `CYCLIC` skip とする。各タスクの**最早開始下限**は、先行タスクの確定結果から `impliedStart` で求めた値の最大を取る。

| 種別 | 後続への制約 | 開始下限（lag はカレンダー日） |
| --- | --- | --- |
| FS | 後続開始 ≥ 先行終了 | `先行終了 + 1 + lag`（翌営業日+lag） |
| SS | 後続開始 ≥ 先行開始 | `先行開始 + lag` |
| FF | 後続**終了** ≥ 先行終了 | `先行終了 + lag − 仮duration + 1`（近似） |
| SF | 後続**終了** ≥ 先行開始 | `先行開始 + lag − 仮duration + 1`（近似） |

- FF/SF は後続の終了日を縛るため、後続の所要日数(duration)が必要だが、duration は開始日が決まらないと確定しない（鶏卵問題）。現状は `仮duration = ceil(予定工数 ÷ 標準稼働時間)`（理想営業日数）で**近似**する。休暇・参画率が絡むと誤差が出る。厳密化（終了日からの逆算 `consumeBackward`）は今後の課題（[§10](#10-既知の制約と今後の課題)）。
- skip された先行や未計算の先行は依存制約として無視する。

### 7.4 開始日の丸めと工数消化
依存下限・担当者の前タスク終了（`assigneeFreeFrom`）・基準日の最大を開始下限とし、`working-calendar-walker.ts` の関数で確定する。

- `nextAvailableDay(下限, cal, consumed)`: 実効稼働時間が正になる最初の日。実効稼働 = `max(0, getAvailableHours − consumed)`（浮動小数の按分残差は epsilon でゼロ扱い）。
- `consumeUntilDone(開始, 残工数, cal, consumed)`: 各稼働日の実効稼働から `min(実効稼働, 残工数)` を消化し、消化し切った最後の稼働日を終了日とする。**実際に消化した量は `consumed` に記録される**。
- 同一担当者の次タスクは前タスクの**終了日を起点**とする（`assigneeFreeFrom`）。終了日に稼働の残余があれば**同日に詰め込まれ**、使い切っていれば `nextAvailableDay` により翌稼働日以降へ送られる。これにより小さいタスクが多数あっても1タスクが1日を占有しない。

担当者の稼働量計算（土日祝・会社休日・個人予定・参画率）は `AssigneeWorkingCalendar.getAvailableHours` に委譲する（[01仕様書](./01-working-hours-allocation.md)）。定常タスク・通常タスクの消費は `consumed` マップ（担当者ごと）で合成され、カレンダー本体は改変しない。

### 7.5 無限ループ防止
`nextAvailableDay` / `consumeUntilDone` / `countWorkingDays` は反復上限（約5年=`366×5`日）を持ち、全日稼働0等で消化できない場合は打ち切る。`consumeUntilDone` が打ち切った場合は `SCHEDULE_OVERFLOW` を立てる。

### 7.6 出力順
結果は `予定開始日 → タスクNo（数値昇順）` でソートする。日付未確定（skip）は末尾。

---

## 8. 前提条件チェック

`SchedulingPreconditionService.check(tasks, dependencies, steadyKeywords)` が計算前の警告を返す（`scheduling-precondition.service.ts`）。**警告があっても計算は続行**し、対象タスクは skip / 循環は除外される。

| `kind` | 条件 |
| --- | --- |
| `NO_ASSIGNEE` | 担当者未設定 |
| `NO_YOTEI_KOSU` | 非定常で予定工数が未設定/0以下 |
| `STEADY_NO_PERIOD` | 定常タスクに予定期間（開始・終了日）が無い |
| `CYCLIC_DEPENDENCY` | 依存に循環あり（`cycleTaskNos` に該当タスクNo） |
| `ON_HOLD` | 保留タスクが含まれる（計算対象になる旨の注意喚起。挙動は未着手と同じ） |
| `COMPLETED_NO_PERIOD` | 完了タスクに日程（実績・予定）が無い（日程未確定のまま固定され、後続の依存制約に反映されない） |
| `EXCEEDS_PROJECT_END` | **計算後の検証**: 算出した終了日がプロジェクト終了日を超過（`checkProjectEnd`、日単位比較。完了固定タスクの実績超過も含む） |

循環検出は `TaskDependencyValidator.detectCycles`（Tarjanの強連結成分、サイズ2以上を循環とみなす）。

---

## 9. 出力

`calculateSchedule` の戻り値 `ScheduleCalculationResult`（すべてプレーン、日付はISO8601文字列）。

| フィールド | 内容 |
| --- | --- |
| `baselineDate` | 解決された基準日（ISO） |
| `warnings` | 前提条件の警告一覧 |
| `scheduledTasks` | 各タスクの計算結果 `ScheduledTaskDto[]`（開始/終了日はISO） |
| `workloads` | 担当者別の日別負荷 `WorkloadData[]` |
| `tsv` | TSV文字列（サーバー生成） |

### 9.1 ガントプレビュー
`scheduledToGanttTasks` / `scheduledToGanttPhases`（`adapters/scheduled-to-gantt.ts`）で ganttv3 の `Task[]` / `GanttPhase[]` に変換し、`GanttChart` を `editMode=false` で表示する。**日付未確定/skipタスクは除外**（タイムライン境界の NaN を防ぐため）。読み取り専用なのでDB書き戻しは構造的に発生しない。

### 9.2 担当者別負荷
計算結果を `WorkloadCalculationService.calculateDailyAllocationsFromSchedule` に流し、`AssigneeGanttChart` に `previewWorkloads` props として渡す（サーバー取得をスキップして計算結果を表示）。過負荷・参画率超過のセル色分けは既存ロジックを踏襲。

### 9.3 TSV
`convertScheduledTasksToTsv`（`tsv-converter.ts`）が `タスクNo / タスク名 / 担当者 / フェーズ / ステータス / 定常 / 予定開始日 / 予定終了日 / 予定工数 / 備考` の列を生成。ダウンロードは Blob + BOM 付与方式。手動調整中は調整後の内容が出力される。

### 9.4 手動調整
自動計算結果を起点にユーザーが画面上で最終調整するモード。ガントのツールバー「編集モード」で開始する。

- **編集手段**: バーのドラッグ（移動／両端リサイズ）と、バークリックで開くインライン編集パネル（予定開始日・終了日・工数・担当者）。ganttv3 の既存編集UI（制御コンポーネント）をそのまま利用しており、**ganttv3 本体は無修正**。
- **状態管理**: 編集は `onTaskUpdate` → `applyGanttTaskToScheduled`（`adapters/scheduled-to-gantt.ts`）で `ScheduledTaskDto[]` のクライアント状態へ非破壊反映されるだけで、**DBへの書き込みは一切発生しない**（一時テーブルも不使用）。
- **負荷・TSV・警告への反映**: 編集からデバウンス（500ms）後に読み取り専用の Server Action `recalculateSchedulePreview` → `recalculatePreview`（アプリケーション層）を呼び、担当者別負荷（`AssigneeGanttChart` の `previewWorkloads`）・TSV・`EXCEEDS_PROJECT_END` 警告を再計算して差し替える。前詰め（`forwardSchedule`）は再実行しない。
- **対象外**: 完了（実績固定, `fixed`）タスクは調整不可（トーストで通知）。
- **巻き戻し**: ツールバーの「キャンセル」は調整モード進入時点へ復元。サマリー行の「調整を破棄して計算結果に戻す」で全調整を破棄。手動調整がある間は件数バッジ（DB未保存の明示）を表示する。
- **再計算**: 「スケジュール計算」を再実行すると調整は破棄され、新しい計算結果に置き換わる。

---

## 10. 既知の制約と今後の課題

- **DB書き戻し非対応**: 計算結果はプレビュー＋TSVのみ。WBSへの反映は MySQL/Excel インポートが本流（[§1](#1-概要)）。
- **FF/SF依存は近似**: 後続の所要日数を理想営業日数で近似するため、休暇・参画率が絡むと誤差が出る。終了日からの逆算（`consumeBackward`）による厳密化は局所改修で対応可能だが未実装。
- **リソース制約の同時最適化は非対応**: 依存・担当者稼働・定常消費を満たす厳密な最適解（リソース制約付きスケジューリング）は対象外。前詰めヒューリスティックによる試算である。
- **タイムゾーン前提**: エンジンの日付キーは**サーバーのローカル日付**（`toDateKey`）で、入力の日付（プロジェクト開始日・CUSTOM基準日等）は UTC 深夜の `Date` を想定する。サーバーTZが UTC（推奨）または UTC+側（JST等）なら日付は一致するが、UTC−側のTZでは1日ずれる。実行環境の TZ は UTC 固定を推奨（CLAUDE.md の日付ポリシー参照）。
- **全日休暇キーワードのハードコード**: 個人予定を全日休暇とみなすタイトル（「休暇」「有給」等）は `AssigneeWorkingCalendar` にハードコードされており、設定化は未対応。

---

## 11. 主要ファイル一覧

### ドメイン (`src/domains/task-scheduling/`)
- `forward-scheduler.ts` — 中核エンジン
- `scheduling-task.ts` / `scheduling-options.ts` / `scheduled-result.ts` — 入出力VO
- `steady-task-classifier.ts` — 定常タスク判定
- `topological-sort.ts` — トポロジカルソート
- `working-calendar-walker.ts` — 稼働日探索・工数消化
- `scheduling-precondition-service.ts` — 前提条件チェック
- `src/domains/task-dependency/task-dependency-validator.ts` — `detectCycles`

### アプリケーション (`src/applications/task-scheduling/`)
- `scheduling-application-service.ts` — オーケストレーション
- `scheduling-task-mapper.ts` — `Task` → `SchedulingTask`
- `baseline-resolver.ts` / `tsv-converter.ts`
- `ischeduling-application-service.ts` / `ischeduling-settings-repository.ts`
- `src/infrastructures/scheduling-settings-repository.ts`

### UI (`src/components/task-scheduling/`)
- `scheduling-workbench.tsx` — メイン画面
- `scheduling-gantt-preview.tsx` — ガントラッパ
- `scheduling-actions.ts` — Server Action
- `adapters/scheduled-to-gantt.ts` — 結果→ガント変換
- `src/components/wbs/project-settings.tsx` — 設定UI
- `src/app/wbs/[id]/assignee-gantt/assignee-gantt-chart.tsx` — 負荷表示（preview props対応）

---

## 12. テスト

| 対象 | テスト |
| --- | --- |
| トポロジカルソート | `src/__tests__/domains/task-scheduling/topological-sort.test.ts` |
| 定常タスク判定 | `steady-task-classifier.test.ts` |
| 稼働日探索・消化 | `working-calendar-walker.test.ts` |
| 中核エンジン（依存/定常/完了/進行中/基準日/上限/循環） | `forward-scheduler.test.ts` |
| 前提条件 | `scheduling-precondition.service.test.ts` |
| 循環検出 | `src/__tests__/domains/task-dependency/task-dependency-validator.test.ts` |
| 負荷按分（計算結果版） | `src/__tests__/domains/assignee-workload/workload-calculation-from-schedule.test.ts` |
| 基準日解決 / TSV変換 | `baseline-resolver.test.ts` / `tsv-converter.test.ts` |
| マッパー | `src/__tests__/applications/task-scheduling/scheduling-task-mapper.test.ts` |
| アプリサービス（結合） | `scheduling-application.service.test.ts` |
| 設定の正規化 | `src/__tests__/types/scheduling-settings.test.ts` |
| ガント変換アダプタ | `src/__tests__/components/task-scheduling/scheduled-to-gantt.test.ts` |
