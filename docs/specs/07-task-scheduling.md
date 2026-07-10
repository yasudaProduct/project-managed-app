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

### 実施日固定タスク (Fixed-date Task)
本番導入・定例会など**実施日が確定している**一回性のタスク。タスク名が設定キーワード（`fixedDateTaskKeywords`）に**部分一致**するもの。前詰めの対象外とし、入力済みの予定開始日・終了日（YOTEI）をそのまま採用する。定常タスクと似るが、①一回性のイベントで見通し工数の専用算出（定常）を伴わない、②定常判定より優先される、点が異なる。**先行チェーンは固定日から逆算配置**され（[§7.3](#73-実施日固定タスクの先行チェーン逆算)）、基準日までに収まらない場合は競合として警告する。

### 逆算配置 (Backward Scheduling)
実施日固定タスクの先行チェーンに適用する配置方式。固定タスクの開始日（依存制約を考慮した最遅終了日）を締切として、稼働カレンダーを**後方に**消費し「固定日に間に合う最遅日程」を求める。前詰めの対義。

### 依存関係 (Dependency)
タスク間の前後制約。種別は FS / SS / FF / SF の4種、遅延 `lag`（カレンダー日）を持つ。詳細は [§7.4](#74-依存制約)。

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
  ├─ SchedulingGanttPreview      （gantt の GanttChart を editMode=false で再利用）
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
| `fixedDateTaskKeywords` | `string[]` | `[]` | 実施日固定タスク判定キーワード（タスク名の部分一致）。一致タスクは前詰めせずYOTEI期間で固定 |
| `consumeSteadyTaskCapacity` | `boolean` | `false` | 定常タスクが担当者の稼働を消費するか |
| `steadyDailyHoursMode` | `'PRORATE' \| 'FIXED'` | `'PRORATE'` | 定常タスクの日次消費量の決定方式 |
| `steadyFixedHoursByKeyword` | `Record<string, number>?` | なし | FIXED時のキーワード別日次固定時間(h/日) |
| `steadyTaskForecastMode` | `'PLANNED' \| 'ACTUAL_PACE' \| 'PLANNED_PACE'` | `'PLANNED'` | 定常タスクの**見通し工数**算出方式（月別集計・ganttの見通しで使用。前詰め計算には影響しない）。詳細は [03: 見通し工数計算 §4.7](./03-forecast-calculation.md) |

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

UIの基準日が非稼働日（土日祝等）の場合でも、実際の各タスク開始は担当者カレンダー上の翌営業日へ自動的に丸められる（[§7.5](#75-開始日の丸めと工数消化)）。

---

## 6. タスクのステータス別扱い

`forwardSchedule` は各タスクをステータスと定常判定で分類する。出力 `ScheduledTask` の `note`（備考コード）で結果種別を表す。

| 区分 | 条件 | 扱い | `note` | `skipped`/`fixed` |
| --- | --- | --- | --- | --- |
| 担当者未設定 | `assigneeId` が null | 計算対象外 | `NO_ASSIGNEE` | skipped |
| 工数未設定 | 非定常・非固定で `yoteiKosu` が null/0以下 | 計算対象外 | `NO_YOTEI_KOSU` | skipped |
| 完了 | `status = COMPLETED` | **実績日程で固定**（前詰めしない） | `COMPLETED_FIXED` | fixed |
| 進行中 | `status = IN_PROGRESS` | **残工数**を基準日以降に前詰め | `IN_PROGRESS_REMAINING` | — |
| 未着手 | `status = NOT_STARTED` 等 | フル工数を前詰め | `NORMAL` | — |
| 実施日固定 | タスク名が `fixedDateTaskKeywords` に部分一致 | **前詰めせずYOTEI期間で固定**（工数0でも配置） | `FIXED_DATE` | — |
| 実施日固定・先行逆算 | 固定タスクの先行チェーン上の通常タスク | **固定日から逆算した最遅日程で配置**（[§7.3](#73-実施日固定タスクの先行チェーン逆算)） | `BACKWARD_FROM_FIXED` | — |
| 実施日固定・先行超過 | 固定/逆算タスクの先行がその開始日を超える（競合は下流の固定・逆算タスクへ伝播） | 日付は維持しつつ競合を通知 | `FIXED_DATE_CONFLICT` | — |
| 実施日固定・期間なし | 固定だが YOTEI 期間が無い | 計算対象外 | `FIXED_NO_PERIOD` | skipped |
| 定常 | タスク名がキーワードに部分一致 | **前詰めせずYOTEI期間のまま** | `STEADY_FIXED_PERIOD` | — |
| 定常・期間なし | 定常だが YOTEI 期間が無い | 計算対象外 | `STEADY_NO_PERIOD` | skipped |
| 循環依存 | 依存の循環に含まれる | 計算対象外 | `CYCLIC` | skipped |
| 計算上限超過 | 全日稼働0等で消化不能 | 打ち切り | `SCHEDULE_OVERFLOW` | — |

- **完了タスクの固定日程**: `実績開始日 ?? 予定開始日` 〜 `実績終了日 ?? 予定終了日`、工数は `実績工数 ?? 予定工数`。実績は `WorkRecord` から導出（`getJissekiStart/End/Kosus`）。
- **進行中の残工数**: `max(0, 予定工数 − 実績工数)`。残0なら開始=終了=基準日相当、工数0で配置。

---

## 7. スケジューリングアルゴリズム

中核は `forwardSchedule(input)`（`forward-scheduler.ts`）。入力はタスク・依存・担当者カレンダー・標準稼働時間・オプション。処理は「分類 → 実施日固定の先置き → 定常の先置き → 固定タスク先行チェーンの逆算 → 通常タスクの前詰め → 固定タスクの競合検出」の順に進む。

### 7.1 フェーズA: 分類と完了固定
全タスクを走査し、担当者未設定 → `NO_ASSIGNEE` skip、完了 → 実績で固定、**非定常かつ非固定**で工数未設定 → `NO_YOTEI_KOSU` skip、に振り分ける。定常・実施日固定タスクは工数0（マイルストーン）でも計算対象として残す。

### 7.2 フェーズB: 実施日固定・定常タスクの先置き
前詰めしないタスクを、依存の先行として参照可能にするため YOTEI 期間のまま結果に**先置き**する。判定は**実施日固定を優先**し、その後に定常を判定する（両方のキーワードに一致する場合は固定扱い）。

- **実施日固定タスク**（`isFixedDateTask`）: `scheduledStart = yoteiStart`, `scheduledEnd = yoteiEnd`, `note = FIXED_DATE`。工数0でも配置する。YOTEI 期間が無ければ `FIXED_NO_PERIOD` skip。**通常タスクと同様に担当者の稼働を消費する**（一回性の確定作業のため。予定工数を固定期間内の稼働日へ按分し `consumed` へ加算。フラグ不要で常時消費）。同一担当者の通常タスクはこの占有を避けて前詰めされる。
- **定常タスク**（`isSteadyTask`）: YOTEI 期間のまま先置き。期間が無ければ `STEADY_NO_PERIOD` skip。稼働消費は `consumeSteadyTaskCapacity`（既定 false）に従う。

`consumeSteadyTaskCapacity = true` の場合、定常タスクが期間中の各稼働日に消費する工数を担当者ごとの消費マップ `consumed[assigneeId][YYYY-MM-DD]` に加算する。日次消費量は次で決まる:

```
steadyDailyHoursMode = FIXED かつ steadyFixedHoursByKeyword に一致キーワードあり
  → その固定値(h/日)
それ以外（PRORATE / 固定値未設定）
  → 予定工数 ÷ 期間内の稼働日数（按分）
```

### 7.3 実施日固定タスクの先行チェーン逆算
実施日固定タスクの先行タスクを基準日から前詰めすると、担当者の稼働状況によっては固定日以降にずれ込んでしまう。これを防ぐため、固定タスクの先行チェーンは**固定日から逆算した最遅日程**で配置する（フェーズB2、定常先置き後・前詰め前）。

1. **チェーン収集**: `FIXED_DATE` で確定した各固定タスクから `predecessorsOf` を遡り、未確定の通常タスクを集める。確定済みタスク（完了・固定・定常・skip）で遡上を止める。
2. **逆トポロジカル順に締切を伝播**: チェーン内タスクを後続→先行の順に処理する。各タスクの**最遅終了日（締切）**は、確定済み後続の日程から `impliedLatestEnd` で求めた値の最小を取る（`impliedStart` の逆演算。FS/FF は厳密、SS/SF は先行の仮 duration による近似）。

   | 種別 | 先行への制約 | 最遅終了日（lag はカレンダー日） |
   | --- | --- | --- |
   | FS | 先行終了 ≤ 後続開始 − 1 − lag | `後続開始 − 1 − lag` |
   | SS | 先行**開始** ≤ 後続開始 − lag | `後続開始 − lag + 仮duration − 1`（近似） |
   | FF | 先行終了 ≤ 後続終了 − lag | `後続終了 − lag` |
   | SF | 先行**開始** ≤ 後続終了 − lag | `後続終了 − lag + 仮duration − 1`（近似） |

3. **後方への工数消化**: `consumeBackward(締切, 残工数, cal, consumed, 基準日)`（`working-calendar-walker.ts`）で、締切以前の最遅稼働日を終了日とし、実効稼働から後方へ消化して開始日を求める。消化分は `delta` に分離して返し、**配置確定時のみ** `consumed` にマージする（通常タスクと同じ実効稼働の合成に乗るため、同一担当者のチェーンタスク同士・非チェーンタスクとの二重予約は起きない）。結果は `note = BACKWARD_FROM_FIXED` で確定する。
4. **前詰めフォールバック**: 逆算した開始日が**基準日より前に食い込む**場合（＝物理的に間に合わない）は逆算せず、従来どおりフェーズCで前詰めする。その結果はフェーズDで `FIXED_DATE_CONFLICT` として検出される（[§7.8](#78-実施日固定タスクの競合検出計算後)）。締切を導けないタスク（後続が全て未確定等）や循環に含まれるタスクも前詰めに回る。

逆算はチェーンタスクを「可能な限り遅く」配置するため、空いた前方の稼働は非チェーンの通常タスクが前詰めで利用できる。進行中タスクは前詰めと同様**残工数**で逆算する。

### 7.4 依存制約
通常タスクをトポロジカル順（`topological-sort.ts`, Kahn法）に処理する。循環ノードは末尾に回し `CYCLIC` skip とする。各タスクの**最早開始下限**は、先行タスクの確定結果から `impliedStart` で求めた値の最大を取る。

| 種別 | 後続への制約 | 開始下限（lag はカレンダー日） |
| --- | --- | --- |
| FS | 後続開始 ≥ 先行終了 | `先行終了 + 1 + lag`（翌営業日+lag） |
| SS | 後続開始 ≥ 先行開始 | `先行開始 + lag` |
| FF | 後続**終了** ≥ 先行終了 | `先行終了 + lag − 仮duration + 1`（近似） |
| SF | 後続**終了** ≥ 先行開始 | `先行開始 + lag − 仮duration + 1`（近似） |

- FF/SF は後続の終了日を縛るため、後続の所要日数(duration)が必要だが、duration は開始日が決まらないと確定しない（鶏卵問題）。現状は `仮duration = ceil(予定工数 ÷ 標準稼働時間)`（理想営業日数）で**近似**する。休暇・参画率が絡むと誤差が出る（[§10](#10-既知の制約と今後の課題)）。
- skip された先行や未計算の先行は依存制約として無視する。

### 7.5 開始日の丸めと工数消化
依存下限・担当者の前タスク終了（`assigneeFreeFrom`）・基準日の最大を開始下限とし、`working-calendar-walker.ts` の関数で確定する。

- `nextAvailableDay(下限, cal, consumed)`: 実効稼働時間が正になる最初の日。実効稼働 = `max(0, getAvailableHours − consumed)`（浮動小数の按分残差は epsilon でゼロ扱い）。
- `consumeUntilDone(開始, 残工数, cal, consumed)`: 各稼働日の実効稼働から `min(実効稼働, 残工数)` を消化し、消化し切った最後の稼働日を終了日とする。**実際に消化した量は `consumed` に記録される**。
- 同一担当者の次タスクは前タスクの**終了日を起点**とする（`assigneeFreeFrom`）。終了日に稼働の残余があれば**同日に詰め込まれ**、使い切っていれば `nextAvailableDay` により翌稼働日以降へ送られる。これにより小さいタスクが多数あっても1タスクが1日を占有しない。

担当者の稼働量計算（土日祝・会社休日・個人予定・参画率）は `AssigneeWorkingCalendar.getAvailableHours` に委譲する（[01仕様書](./01-working-hours-allocation.md)）。定常タスク・通常タスクの消費は `consumed` マップ（担当者ごと）で合成され、カレンダー本体は改変しない。

### 7.6 無限ループ防止
`nextAvailableDay` / `consumeUntilDone` / `consumeBackward` / `countWorkingDays` は反復上限（約5年=`366×5`日）を持ち、全日稼働0等で消化できない場合は打ち切る。`consumeUntilDone` が打ち切った場合は `SCHEDULE_OVERFLOW` を立てる。`consumeBackward` は基準日を下限として打ち切り、配置不可として前詰めへフォールバックする。

### 7.7 出力順
結果は `予定開始日 → タスクNo（数値昇順）` でソートする。日付未確定（skip）は末尾。

### 7.8 実施日固定タスクの競合検出（計算後）
通常タスクの前詰め後、各実施日固定タスク（`FIXED_DATE`）と逆算配置タスク（`BACKWARD_FROM_FIXED`）について先行タスクの `impliedStart`（[§7.4](#74-依存制約)と同じ式）を求め、その最早開始下限が自タスクの開始日を超える場合は `note` を `FIXED_DATE_CONFLICT` に更新する。**日付そのものは変更しない**（前工程が固定日に間に合わないというリスケ判断シグナルとしてのみ扱う）。競合は依存の下流にある固定・逆算タスクへも**伝播**させ、チェーン上流の遅延が固定日を脅かすことを固定タスク自身にも明示する。この結果は `SchedulingPreconditionService.checkFixedDateConflicts` により `FIXED_DATE_CONFLICT` 警告へ変換される。

---

## 8. 前提条件チェック

`SchedulingPreconditionService.check(tasks, dependencies, steadyKeywords, fixedDateKeywords?)` が計算前の警告を返す（`scheduling-precondition.service.ts`）。**警告があっても計算は続行**し、対象タスクは skip / 循環は除外される。

| `kind` | 条件 |
| --- | --- |
| `NO_ASSIGNEE` | 担当者未設定 |
| `NO_YOTEI_KOSU` | 非定常・非固定で予定工数が未設定/0以下 |
| `STEADY_NO_PERIOD` | 定常タスクに予定期間（開始・終了日）が無い |
| `FIXED_NO_PERIOD` | 実施日固定タスクに実施日（予定開始・終了日）が無い |
| `CYCLIC_DEPENDENCY` | 依存に循環あり（`cycleTaskNos` に該当タスクNo） |
| `ON_HOLD` | 保留タスクが含まれる（計算対象になる旨の注意喚起。挙動は未着手と同じ） |
| `COMPLETED_NO_PERIOD` | 完了タスクに日程（実績・予定）が無い（日程未確定のまま固定され、後続の依存制約に反映されない） |
| `FIXED_DATE_CONFLICT` | **計算後の検証**: 実施日固定・逆算配置タスクの先行がその開始日を超える（`checkFixedDateConflicts`。前工程が固定日に間に合わない。競合は下流の固定・逆算タスクへ伝播） |
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
`scheduledToGanttTasks` / `scheduledToGanttPhases`（`adapters/scheduled-to-gantt.ts`）で gantt の `Task[]` / `GanttPhase[]` に変換し、`GanttChart` を `editMode=false` で表示する。**日付未確定/skipタスクは除外**（タイムライン境界の NaN を防ぐため）。読み取り専用なのでDB書き戻しは構造的に発生しない。

### 9.2 担当者別負荷
計算結果を `WorkloadCalculationService.calculateDailyAllocationsFromSchedule` に流し、`AssigneeGanttChart` に `previewWorkloads` props として渡す（サーバー取得をスキップして計算結果を表示）。過負荷・参画率超過のセル色分けは既存ロジックを踏襲。

### 9.3 TSV
`convertScheduledTasksToTsv`（`tsv-converter.ts`）が `タスクNo / タスク名 / 担当者 / フェーズ / ステータス / 定常 / 予定開始日 / 予定終了日 / 予定工数 / 備考` の列を生成。ダウンロードは Blob + BOM 付与方式。手動調整中は調整後の内容が出力される。

### 9.4 手動調整
自動計算結果を起点にユーザーが画面上で最終調整するモード。ガントのツールバー「編集モード」で開始する。

- **編集手段**: バーのドラッグ（移動／両端リサイズ）と、バークリックで開くインライン編集パネル（予定開始日・終了日・工数・担当者）。gantt の既存編集UI（制御コンポーネント）をそのまま利用しており、**gantt 本体は無修正**。
- **状態管理**: 編集は `onTaskUpdate` → `applyGanttTaskToScheduled`（`adapters/scheduled-to-gantt.ts`）で `ScheduledTaskDto[]` のクライアント状態へ非破壊反映されるだけで、**DBへの書き込みは一切発生しない**（一時テーブルも不使用）。
- **負荷・TSV・警告への反映**: 編集からデバウンス（500ms）後に読み取り専用の Server Action `recalculateSchedulePreview` → `recalculatePreview`（アプリケーション層）を呼び、担当者別負荷（`AssigneeGanttChart` の `previewWorkloads`）・TSV・`EXCEEDS_PROJECT_END` 警告を再計算して差し替える。前詰め（`forwardSchedule`）は再実行しない。
- **対象外**: 完了（実績固定, `fixed`）タスクは調整不可（トーストで通知）。
- **巻き戻し**: ツールバーの「キャンセル」は調整モード進入時点へ復元。サマリー行の「調整を破棄して計算結果に戻す」で全調整を破棄。手動調整がある間は件数バッジ（DB未保存の明示）を表示する。
- **再計算**: 「スケジュール計算」を再実行すると調整は破棄され、新しい計算結果に置き換わる。

---

## 10. 既知の制約と今後の課題

- **DB書き戻し非対応**: 計算結果はプレビュー＋TSVのみ。WBSへの反映は MySQL/Excel インポートが本流（[§1](#1-概要)）。
- **FF/SF依存（および逆算のSS/SF）は近似**: 所要日数(duration)を `ceil(予定工数 ÷ 標準稼働時間)`（理想営業日数）で近似するため、休暇・参画率が絡むと誤差が出る。誤差により依存制約を割った場合はフェーズDの検査（[§7.8](#78-実施日固定タスクの競合検出計算後)）で `FIXED_DATE_CONFLICT` として顕在化する。
- **逆算配置は最遅配置（ALAP）ヒューリスティック**: 固定タスクの先行チェーンは「固定日に間に合う最遅日程」で配置するため、前倒しの余地（スラック）は画面上に現れない。早めに着手したい場合は手動調整（[§9.4](#94-手動調整)）で前倒しする。
- **リソース制約の同時最適化は非対応**: 依存・担当者稼働・定常消費を満たす厳密な最適解（リソース制約付きスケジューリング）は対象外。前詰めヒューリスティックによる試算である。
- **実施日固定タスクの判定はキーワード方式**: 固定対象はタスク名の部分一致（`fixedDateTaskKeywords`）で判定する。命名に依存するため、1タスク単位の厳密な指定が必要な場合は将来的にタスク単位のフラグ（例: `WbsTask.scheduleFixed`）への拡張が想定される。なお固定タスクは通常タスク同様に担当者の稼働を消費する（同一担当者の通常タスクは固定タスクの占有を避けて前詰めされる）。工数の期間内配分は按分（`予定工数 ÷ 固定期間内の稼働日数`）で近似する。
- **タイムゾーン前提**: エンジンの日付キーは**サーバーのローカル日付**（`toDateKey`）で、入力の日付（プロジェクト開始日・CUSTOM基準日等）は UTC 深夜の `Date` を想定する。サーバーTZが UTC（推奨）または UTC+側（JST等）なら日付は一致するが、UTC−側のTZでは1日ずれる。実行環境の TZ は UTC 固定を推奨（CLAUDE.md の日付ポリシー参照）。
- **全日休暇キーワードのハードコード**: 個人予定を全日休暇とみなすタイトル（「休暇」「有給」等）は `AssigneeWorkingCalendar` にハードコードされており、設定化は未対応。

---

## 11. 主要ファイル一覧

### ドメイン (`src/domains/task-scheduling/`)
- `forward-scheduler.ts` — 中核エンジン
- `scheduling-task.ts` / `scheduling-options.ts` / `scheduled-result.ts` — 入出力VO
- `steady-task-classifier.ts` — 定常タスク判定
- `fixed-date-task-classifier.ts` — 実施日固定タスク判定
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
| 実施日固定タスク判定 | `fixed-date-task-classifier.test.ts` |
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
