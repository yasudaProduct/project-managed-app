# 構想: 案件外作業（定常・不定期作業）の管理

- ステータス: **構想（未確定）**（2026-11-03 作成。実装前に [§10 確認事項](#10-確認事項) の回答を得て確定させる）
- 目的: 開始・終了が決まった「案件」以外に実務で発生する **定常作業（社内雑務・保守など）** と **不定期作業（障害対応・突発的な依頼など）** を本システムで管理し、その時間を担当者別の負荷（担当者別ガント）に反映して精度を上げる
- 関連仕様: [01: 営業日按分](../specs/01-working-hours-allocation.md), [06: MySQLインポート](../specs/06-mysql-import.md), [07: タスクスケジューリング](../specs/07-task-scheduling.md), [08: 担当者別作業負荷ヒートマップ](../specs/08-assignee-workload-heatmap.md), [10: データの鮮度](../specs/10-data-freshness.md), [要件整理: 進捗管理・分析](./progress-management-analysis-requirements.md)

---

## 1. 背景と課題

本システムの管理単位は **プロジェクト（案件）** であり、`Projects` は開始日・終了日を必須とし、`INACTIVE → ACTIVE → DONE` のライフサイクルを持つ。計画は WBS のタスク（予定期間＋予定工数）、実績は Geppo 月報の取込（`WorkRecord`）で持つ。

一方、実務では案件に属さない作業が常にある。

| 種類 | 例 | 特徴 |
|---|---|---|
| 定常作業 | 社内雑務（定例会議・勤怠・教育・総務対応）、納品済みシステムの保守（問い合わせ対応・監視・定期作業） | 終わりがない（または契約年度単位）。1日・1か月あたりの量はおおむね一定で、担当者は固定されがち |
| 不定期作業 | 障害対応、突発的な調査依頼、営業支援、採用面接、監査対応 | いつ発生するか読めない。事後に実績としてだけ分かるものと、数日前に分かる短期のものがある |

これらが本システムに無いことで、次の問題が起きている。

1. **担当者負荷が実態より空いて見える。** 担当者別ガント（[08仕様書](../specs/08-assignee-workload-heatmap.md)）は案件 WBS のタスク配分しか載らないため、保守や雑務で毎日 1〜2 時間使っている担当者も「空き」に見える。スケジューリング（[07仕様書](../specs/07-task-scheduling.md)）の前詰め結果も楽観的になる。
2. **案件外の実績の行き場がない。** Geppo には案件外の行も記録されるが、本システムでは `PROJECT_ID` が WBS 名に一致しない行は WBS・タスクに紐づかない `WorkRecord`（ユーザーのみ対応）になり、どの画面にも出ない（[§9.1](#91-geppo-の案件外行の取込挙動現状の不具合) に挙げる不具合もある）。
3. **参画率で吸収するには粗い。** `WbsAssignee.rate` は「その案件に割ける取り分」であり、「定常で何時間使うか」を表す場所ではない。複数案件の参画率の合計も検証されない。

---

## 2. 目標

| # | 目標 | 対応する既存仕様 |
|---|---|---|
| G1 | 担当者別ガント（横断・WBS内「他WBS考慮」）に、案件外作業の **予定負荷** が載る | 08 §7, 07 §7.8 |
| G2 | 過去の日については **実績**（案件・案件外を含む）で負荷を見られる | 08, 10 |
| G3 | 案件の分析（EVM・ポートフォリオ・見積精度・遅延）を **汚さない** | 02, 09, 11, 14 |
| G4 | 実績の入力元は **Geppo のまま**（本システムへの二重入力を増やさない） | 06 |
| G5 | 定常作業の予定（枠）を **実績で見直せる**（枠の妥当性が分かる） | 03 §4.7 |

---

## 3. 既存の仕組みで使えるもの・足りないもの

| 既存の仕組み | 使える点 | 足りない点 |
|---|---|---|
| `Projects` / `Wbs` / `WbsTask` / `WbsAssignee` | 担当者・タスク・実績紐付け・画面が揃っている。Geppo 取込は `PROJECT_ID = wbs.name`、`WBS_NO = taskNo` で対応づく | 終了日必須。案件の分析（EVM 等）が自動で対象にする |
| 定常タスク（`steadyTaskKeywords`、`consumeSteadyTaskCapacity`、`PRORATE / FIXED`、`steadyTaskForecastMode`） | 「期間中一定工数を消費し、前詰めしない」概念と、稼働消費・見通しの方式が既にある | 判定がタスク名のキーワード部分一致。案件 WBS の中のプロジェクト管理タスクが想定で、案件外の受け皿ではない |
| 横断合算（`ICrossWbsWorkloadService` / `LabeledAllocationSet` / `WorkloadMergeService`） | 「ラベル付きの日別配分セット」を足すだけで負荷に載る。R バッジ・分母の設計もそのまま使える | 対象 WBS が「未開始・進行中プロジェクトの最新 WBS」で、案件外の区別が無い |
| `ExternalLoadAwareCalendar`（07 §7.8） | 外部負荷は参画率の「取り分」の外から消費される。定常負荷をここに流せば案件の前詰めに自然に効く | — |
| `WorkRecord`（`taskId` / `wbsId` が null 許容） | 案件外の実績も保存できる構造 | 表示・集計が無い。取込時の挙動に不具合（§9.1） |
| `UserSchedule`（個人予定。分母を減らす） | 「使えない時間」の表現として機能している | 定常作業を個人予定にすると TSV 取込の `replaceAll` で消える。負荷として見えず、実績と比較できない |

---

## 4. 作業の分類と計画の持ち方

案件外作業を 1 つの受け皿にまとめたうえで、計画の持ち方を 2 種類に分ける。

| 分類 | 計画の持ち方 | 実績 | 例 |
|---|---|---|---|
| 定常（常時一定） | **定常枠**: 担当者ごとの「1日あたり h」または「1か月あたり h」＋有効期間 | Geppo（毎日） | 社内雑務 0.5h/日、保守 X 20h/月 |
| 不定期（予測できない） | 定常枠に **予備枠** として含める（例: 「突発対応」0.5h/日）。発生後は実績だけが残る | Geppo | 障害対応、問い合わせ |
| 不定期（数日前に分かる短期） | 受け皿の WBS に **単発タスク**（予定期間＋予定工数）として登録。通常タスクと同じ扱い | Geppo | 来週の監査対応 3 日、採用面接 |

「不定期」を無理に予定化せず、**平均量は枠で、分かったものはタスクで** 持つのが要点。枠と実績の差が大きければ枠を見直す（G5）。

---

## 5. モデリングの選択肢と推奨

| 案 | 内容 | 利点 | 欠点 |
|---|---|---|---|
| **A. 常設プロジェクト（推奨）** | `Projects` に **種別**（案件 / 常設）を追加し、案件外作業は「常設プロジェクト」の WBS で持つ。定常タスクには **定常枠** を付ける | Geppo 取込・担当者・タスク・横断合算・画面をそのまま使える。変更が「種別で含める／除く」に集約される。運用で先行試行できる（§7 Step 0） | 案件向け機能が常設を扱わないよう、機能ごとの除外ルールが必要（§6.6）。`Projects` に条件分岐が入る |
| B. 独立した集約（定常業務） | `StandingWork` / `StandingWorkAssignment` / 実績リンクを新設 | 案件の概念と混ざらない。モデルが素直 | Geppo マッピング・実績・担当者・画面を一式作り直す。横断負荷への合流点も別途必要。工数が大きい |
| C. 個人予定（分母）として扱う | 定常作業を `UserSchedule` の繰り返し予定として登録し、稼働可能時間を減らす | 実装がほぼ不要 | 負荷として見えず（空きが減るだけ）、実績と比較できない。個人予定 TSV 取込の `replaceAll` で消える。不定期の単発作業を表せない |

**推奨は A**。理由は、本システムの負荷計算・実績取込がすべて「WBS」を起点に組まれており、案件外作業も WBS として持てば **配分セットを 1 種類増やすだけ** で G1〜G4 を満たせるため。B の「概念を混ぜない」利点は、種別による除外ルールを仕様として明文化することで代替する。C は「見えなくなる」ため採らない（ただし定常枠の分母側への反映は将来の表示オプションとして残す。§6.4）。

---

## 6. 推奨案の設計

### 6.1 概念モデル

```
Projects(kind = PROJECT)  … 従来の案件（変更なし）
Projects(kind = STANDING) … 常設プロジェクト（終了日は任意）
  └ Wbs（1件。名前 = Geppo の PROJECT_ID に合わせる）
      ├ WbsAssignee（担当者。参画率は負荷計算に使わない）
      ├ WbsTask（定常タスク）── SteadyWorkPlan（定常枠: h/日 or h/月, 有効期間）
      ├ WbsTask（単発タスク）── TaskPeriod(YOTEI) + TaskKosu（従来どおり）
      └ WorkRecord（Geppo 取込。従来どおり taskNo で紐付け）
```

### 6.2 用語

| 用語 | 定義 |
|---|---|
| 常設プロジェクト (Standing Project) | `kind = STANDING` のプロジェクト。案件外作業の受け皿。開始日は必須、終了日は任意（保守契約の終了など）。ステータスは従来どおり（`DONE` / `CANCELLED` で対象外になる） |
| 定常タスク | 常設プロジェクト内で **定常枠を持つ** タスク。「完了」概念を持たない。案件 WBS 内の定常タスク（キーワード判定）とは別物で、名前での判定はしない |
| 定常枠 (Steady Work Plan) | 定常タスクの担当者が使う予定量。`unit`（`PER_DAY` / `PER_MONTH`）、`hours`、`validFrom`、`validTo?`。同一タスクで期間が重ならない複数行を持てる（4月から 2h/日、10月から 1h/日 など） |
| 単発タスク | 常設プロジェクト内で定常枠を持たないタスク。予定期間・予定工数を持ち、通常タスクと同じ按分・遅延判定を受ける |
| 分類 (category) | 常設プロジェクトの分類。`MAINTENANCE`（保守）/ `INTERNAL`（社内）/ `OTHER`。集計・表示の色分け用 |

### 6.3 データモデル案

```prisma
enum ProjectKind {
  PROJECT   // 案件（従来）
  STANDING  // 常設（定常・不定期作業の受け皿）
}

enum StandingCategory {
  MAINTENANCE
  INTERNAL
  OTHER
}

model Projects {
  // 既存に追加
  kind     ProjectKind       @default(PROJECT)
  category StandingCategory? // STANDING のみ
  endDate  DateTime?         @db.Date // STANDING は任意（PROJECT はドメインで必須を維持）
}

enum SteadyPlanUnit {
  PER_DAY   // 1営業日あたり
  PER_MONTH // 1か月あたり（その月の稼働可能時間で日別按分）
}

model SteadyWorkPlan {
  id        Int            @id @default(autoincrement())
  taskId    Int            // WbsTask（常設プロジェクトのタスク）
  unit      SteadyPlanUnit
  hours     Decimal        // ≥ 0
  validFrom DateTime       @db.Date
  validTo   DateTime?      @db.Date
  task      WbsTask        @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId, validFrom])
  @@map("steady_work_plan")
}
```

不変条件:
- `PROJECT` は `startDate ≤ endDate`（従来）。`STANDING` は `endDate` が null でよく、ある場合は `startDate ≤ endDate`
- `SteadyWorkPlan.hours ≥ 0`、`validFrom ≤ validTo`、同一 `taskId` で有効期間が重ならない
- 定常枠を持てるのは `kind = STANDING` の WBS のタスクのみ。担当者未設定のタスクには付けられない

### 6.4 定常枠から日別負荷への展開

横断合算（[08仕様書 §7](../specs/08-assignee-workload-heatmap.md#7-複数wbsの合算他wbs考慮)）に **常設分の `LabeledAllocationSet`** を加える。ラベルは `projectName`（例: 「保守: Xシステム」）で、常設分は常にラベル付き（R バッジ判定の「ラベル無し＝現 WBS」規約を壊さない）。

```
対象日 d（表示範囲内の各日）について
  d が会社休日 → 0
  担当者の全日休暇 → 0
  d が枠の有効期間外 → 0

  unit = PER_DAY   → hours(d) = hours
                     （半休など個人予定で稼働が減る日も減らさない。
                       定常作業は休んだ分を他日に回さない前提）
  unit = PER_MONTH → d の属する月を 1 つの疑似タスク
                     { start: 月初, end: 月末, hours } とみなし、
                     既存の WorkloadCalculationService.calculateDailyAllocationsFromSchedule
                     で担当者の稼働可能時間に比例按分する（08 §5.2 と同じ式）
```

- `PER_DAY` は 07 仕様書の `steadyDailyHoursMode = FIXED`、`PER_MONTH` は `PRORATE` に対応し、考え方を揃える
- 常設 WBS の `WbsAssignee.rate` は分母・分子のどちらにも使わない（枠が負荷そのもの）。横断行の分母は従来どおり「標準勤務時間 − 個人予定」（08 §7.3）
- スケジューリング（07 §7.8）では常設分も外部負荷として `ExternalLoadAwareCalendar` に流す。参画率は取り分の予約のままなので、例えば参画率 0.8（6.0h）の担当者に定常 1h/日があっても `7.5 − 1 = 6.5 ≥ 6.0` で案件の前詰めは影響を受けず、既存の設計思想と整合する
- 将来オプション: 「定常枠を分母から引いて表示」する切替（C 案相当の見え方）。既定は負荷として表示する

### 6.5 実績（Geppo）との対応

- 取込ロジックは変更しない。常設 WBS の名前を Geppo の `PROJECT_ID`、定常・単発タスクの `taskNo` を `WBS_NO` に合わせて作ることで、従来どおり `WorkRecord` が紐づく
- 定常タスクの実績は「月 × 担当者 × タスク」で枠と比較する（§6.7 実績タブ）
- Geppo 側の `PROJECT_ID` が WBS 名として使いにくい場合（空・記号など）に備え、**別名表（Geppo PROJECT_ID → WBS）** を Step 2 以降の選択肢として残す（現状は `wbs.name` 完全一致のみ。[06仕様書 §4.2](../specs/06-mysql-import.md)）
- 既存の `routine_work`（MySQL: member × task × manhour）は Geppo 側の定常作業マスタと見られる。定常枠の初期値の取込元になり得る（§10 Q1）

### 6.6 各機能での扱い（含める／除く）

| 機能 | 常設プロジェクトの扱い | 備考 |
|---|---|---|
| 担当者負荷（横断 `/assignee-gantt`） | **含める**（定常枠＋単発タスク。ラベル「分類: 名前」） | G1 |
| WBS内担当者ガント「他WBS考慮」 | **外部負荷として含める** | 08 §7.1 |
| タスクスケジューリング「他WBSの負荷を考慮」 | **外部負荷として含める** | 07 §7.8 |
| 常設 WBS 自身のスケジューリング・ガント（タスクバー）・EVM・進捗履歴タブ | **対象外**（タブ非表示） | 完了概念がない |
| EVM ダッシュボード / プロジェクト別 EVM | **除く** | G3 |
| ポートフォリオ | **除く**（将来: 「常設の負荷合計」を別枠で出す案） | 11 |
| 見積精度 | **除く** | 14 |
| 遅延タスク | 定常タスクは除く。単発タスクは **含める**（期限を持つため） | 09 |
| マイルストーン / スナップショット（進捗履歴） | **除く** | 12, 13 |
| データの鮮度（入力漏れ） | 入力漏れ判定の「予定期間」に **定常枠の有効期間を含める**（常設に担当があれば毎営業日の入力が期待される）。設定で OFF にできる | 10 §3 |
| 通知 | 期限・工数超過は除く。将来: 「月の実績が枠の 80/100% 超」を `manhourThreshold` と同じ仕組みで通知 | — |
| WBS 同期（Excel → MySQL → 本システム） | 常設は手入力が基本。定期インポート設定は作らない（作れても推奨しない） | 06 |
| Geppo 取込 | **そのまま**。取込ジョブの対象プロジェクトに常設を含める | 06 |
| ダッシュボード（プロジェクト数など） | **除く** | — |
| プロジェクト一覧 | 種別列・フィルタを追加。既定は案件のみ、または種別で区分表示 | — |

「含める／除く」はサービス層で `kind` を見て決め、UI 側の判定に散らさない。横断で対象 WBS を解決する `ITargetWbsQueryRepository.findTargetWbs()` は `kind` を返すよう拡張し、呼び出し側（負荷・ポートフォリオ・見積精度）がそれぞれ絞る。

### 6.7 画面案

| 画面 | 内容 |
|---|---|
| プロジェクト一覧 `/projects` | 種別（案件／常設）の列とフィルタ。「常設プロジェクトを作成」は簡易フォーム（名前・分類・開始日・終了日(任意)） |
| 常設 WBS 画面 `/wbs/[id]` | タブを **リスト / 定常枠 / 担当者ガント / 実績 / 設定** に絞る |
| 定常枠タブ（新規） | 表: 行 = 定常タスク（担当者）、列 = 枠（`h/日` or `h/月`）・有効期間・**直近3か月の実績平均**。「実績で更新」で平均値を新しい枠として提案（G5） |
| 「割込み作業を追加」ダイアログ | 担当者・名前・期間・工数だけで単発タスクを作る（既存のタスク作成フォームの簡易版）。担当者負荷画面からも開けるようにする |
| 実績タブ（新規） | 月 × 担当者 × タスクの「枠（予定）／実績／差」。分類別の合計 |
| 担当者負荷 | セル詳細（Sheet）に「常設」グループを追加し、案件分と分けて表示。行の下に「定常 n h/日」の固定帯（任意） |

### 6.8 担当者負荷の「予定／実績」切替（G2）

現状の担当者負荷はすべて予定（配分）で描く。常設を入れると「過去の日はどうだったか」を実績で見たくなるため、切替を追加する。

| モード | 昨日以前 | 今日以降 |
|---|---|---|
| 予定（既定） | 予定配分 | 予定配分 |
| 実績 | `WorkRecord` の合計（全 WBS 横断。案件／常設／未紐付けで色分け） | 予定配分 |

- 実績モードの過去日では、入力漏れ（10 仕様書）の日を「未入力」として強調する
- 実績は Geppo 取込後にしか増えないため、ヘッダーに「実績は ○月○日取込時点」を出す（10 仕様書の鮮度表示を流用）

---

## 7. 段階的な進め方（ロードマップ案）

| Step | 内容 | 開発規模 | 得られるもの |
|---|---|---|---|
| **0. 運用で先行（開発なし）** | `ACTIVE` の案件として「社内業務」「保守 X」プロジェクトを作る（終了日は遠い将来）。WBS 名を Geppo `PROJECT_ID` に合わせ、定常作業は定常キーワードに一致する名前のタスク＋年度の予定期間＋予定工数（h/日 × 営業日数）で登録。担当者の参画率は 1.0 | なし | 横断の担当者負荷に載る。Geppo 実績も紐づく。**ただし** ポートフォリオ・EVM・見積精度に混ざり、終了日を延ばし続ける必要がある。構想の妥当性を確かめる試行として位置づける |
| **1. 種別と除外ルール** | `Projects.kind` / `category` / `endDate` 任意化、§6.6 の除外、プロジェクト一覧の種別フィルタ、常設 WBS のタブ絞り込み | 小〜中 | Step 0 の「混ざる」問題が解消し、常設を正式に運用できる |
| **2. 定常枠と負荷への反映** | `SteadyWorkPlan`、定常枠タブ、横断合算・外部負荷への常設セット追加（§6.4）、入力漏れ判定への反映 | 中 | 年度の期間＋工数に置き換える運用が不要になる。枠の単位が実務の感覚（h/日・h/月）に合う |
| **3. 実績表示と枠の見直し、単発作業の簡易登録** | 担当者負荷の予定／実績切替（§6.8）、実績タブ、「実績で更新」提案、「割込み作業を追加」 | 中 | G2・G5。不定期作業の登録コストが下がる |
| **4. 保守契約の工数管理（任意）** | 常設タスクに `monthlyBudgetHours`（契約工数）を持ち、消化率・超過通知。Geppo 別名表 | 小〜中 | 保守の請求・契約管理と負荷管理がつながる |

Step 1 と 2 は同時に進めてもよい。Step 0 は開発の前に **実際の Geppo の案件外行がどの `PROJECT_ID` / `WBS_NO` で入っているか** を確かめる目的も兼ねる（§10 Q1）。

---

## 8. 既存コードへの主な影響（Step 1〜2）

| 層 | 対象 | 変更 |
|---|---|---|
| Prisma | `prisma/schema.prisma` | `ProjectKind` / `StandingCategory` / `SteadyPlanUnit`、`Projects.kind` `category` `endDate?`、`SteadyWorkPlan` |
| ドメイン | `src/domains/project/project.ts` | `kind` と種別ごとの不変条件（終了日） |
| ドメイン | `src/domains/wbs/`（新規 `steady-work-plan.ts`） | 定常枠の値オブジェクト・期間重複の検証・日別展開（§6.4）。純粋関数として単体テスト |
| アプリケーション | `src/applications/cross-wbs-workload/cross-wbs-workload-service.ts` | 常設 WBS の配分セット生成（枠 → `ScheduleAllocationInput[]` → 既存按分）。`getExternalAllocationSets` にも含める |
| アプリケーション | `src/applications/cross-wbs-workload/itarget-wbs-query-repository.ts` と実装 | `TargetWbsInfo` に `kind` を追加。ポートフォリオ・見積精度・ダッシュボードは `PROJECT` のみに絞る |
| アプリケーション | `src/applications/data-freshness/` | 入力漏れ判定の予定期間に定常枠の有効期間を加える（設定で OFF） |
| アプリケーション | 常設プロジェクト用の Application Service（作成・定常枠 CRUD・実績比較） | 新設。Server Action から Prisma を直接触らない（[04 原則](../04-architecture-principles.md)） |
| インフラ | `ISteadyWorkPlanRepository` の Prisma 実装、`IProjectRepository` の種別対応 | 新設・拡張 |
| UI | `/projects`、`/wbs/[id]`（タブ）、定常枠タブ、実績タブ、`src/components/assignee-gantt/`（セル詳細の常設グループ） | 追加・変更 |
| DI | `src/types/symbol.ts`、`src/lib/inversify.config.ts` | 新規サービス・リポジトリの登録 |
| ドキュメント | `docs/05-domain-model.md`、`docs/06-screen-list.md`、`docs/specs/08`・`07`・`10` | 常設の扱いを追記 |

---

## 9. リスク・注意点

### 9.1 Geppo の案件外行の取込挙動（現状の不具合）

現状、`PROJECT_ID` が WBS 名に一致しない Geppo 行は、ユーザーだけが対応づいた `WorkRecord`（`wbsId` / `taskId` が null）として変換・保存される（[06仕様書 §4.2](../specs/06-mysql-import.md)「プロジェクト未マッピングは warnings」）。このとき次の問題がある。

- `merge` モード: `bulkUpsert` の検索条件が `taskId: undefined, wbsId: undefined` となり、Prisma は undefined の条件を無視するため、**同じユーザー・同じ日の別タスクの実績を上書きし得る**
- `replace` モード: 削除対象がマッピング済み WBS に限られるため、案件外行は削除されず **再取込のたびに増殖** する

いずれも取込ジョブの対象プロジェクト（`targetProjectIds`）を指定せずに実行した場合に起きる。常設プロジェクトを導入すると案件外行が紐づくようになり影響は減るが、未登録の `PROJECT_ID` は残り得るため、**導入前に別件として修正する**（未マッピング行はスキップするか、`taskId IS NULL` を明示した検索にする）。

### 9.2 二重計上

案件 WBS 内に「プロジェクト管理」などの定常タスク（キーワード判定）があるのは従来どおり許容する。常設側には「案件に属さない」作業だけを置く運用規約とし、同じ作業を両方に置かない。

### 9.3 参画率との関係

常設の定常枠は負荷（分子）として扱い、案件側の参画率は「取り分の予約」のまま変えない（§6.4）。参画率を「定常分を引いた残り」に読み替えると既存の R バッジ・外部負荷の式と食い違うため、採らない。

### 9.4 入力漏れ判定の広がり

常設に担当者を置くと、その担当者は毎営業日が入力漏れの判定対象になる（§6.6）。月報を毎日入力する運用と整合するが、兼務が少ない担当者には煩わしい可能性があるため設定で切れるようにする。

### 9.5 「1 プロジェクト 1 WBS」の前提

横断集計はプロジェクトごとに最新 WBS 1 件を対象にする（08 §2）。常設も 1 WBS で運用する。年度で WBS を分けると年度跨ぎの枠が途切れるため、WBS は分けず定常枠の有効期間で表現する。

### 9.6 長期間の按分コスト

`PER_MONTH` の按分は月単位の疑似タスクに展開するため、既存の按分計算量（08 §10）を大きく増やさない。`PER_DAY` は按分を伴わない。

---

## 10. 確認事項

| # | 質問 | 影響する設計 |
|---|---|---|
| Q1 | Geppo 側で案件外の作業（社内・保守）は現在どの `PROJECT_ID` / `WBS_NO` で記録されているか。`routine_work` テーブルの用途は何か | §6.5（WBS 名の付け方、別名表の要否、定常枠の初期値） |
| Q2 | 定常枠の単位は「h/日」と「h/月」の 2 つで足りるか（週単位の要望はあるか） | §6.3 `SteadyPlanUnit` |
| Q3 | 保守は契約工数（月額）との消化率管理が必要か。請求に絡むか | §7 Step 4 |
| Q4 | 常設の担当者にも入力漏れ判定を適用してよいか（既定 ON でよいか） | §6.6 |
| Q5 | 常設プロジェクトの作成・定常枠の設定は誰が行うか（本人／PM／管理者）。権限制御は必要か | §6.7 |
| Q6 | 担当者負荷の既定表示を「予定」のままにしてよいか。実績モードを既定にする要望はあるか | §6.8 |
| Q7 | Step 0（運用で先行）を実施するか。実施する場合、どの常設プロジェクトから始めるか | §7 |

---

## 11. 実装設計（Step 1・2）

- ステータス: **実装済み**（2026-11-03。ブランチ `feature/non-project-work`。統合テスト `src/__integration_tests__/infrastructures/steady-work-plan-repository.test.ts` を含む）
- 対象: [§7](#7-段階的な進め方ロードマップ案) の Step 1（種別と除外ルール）と Step 2（定常枠と負荷への反映）。Step 3（予定／実績切替・実績タブ・割込み作業ダイアログ）と Step 4 は対象外
- 進め方: TDD（テストを先に書いて失敗を確認してからコミットし、実装でテストを通す）。既存機能は「種別 = 案件（`PROJECT`）」の挙動を一切変えない

### 11.1 構想からの差分（決定事項）

| 項目 | 構想（§6） | 実装（今回） | 理由 |
|---|---|---|---|
| 常設プロジェクトの終了日 | 任意 | **必須のまま**（保守契約の終了日や年度末を入れる） | `endDate` を null 許容にすると DTO・画面（約 40 ファイル）に波及するため Step 1 では見送る。負荷計算は定常枠の有効期間で決まるので、終了日は運用上の目安に留まる |
| 定常タスクの作成 | タスク登録画面から | **定常枠タブから「定常タスクを追加」**（名前・担当者のみ）。工程が無い場合は既定の工程「定常」（コード `STD`）を自動作成 | 通常のタスク登録は工程・予定期間・工数が必須で、定常タスクには不要なため |
| 種別の変更 | — | 作成時のみ指定。**作成後は変更不可** | 案件 ↔ 常設の切替は EVM スナップショット等の既存データの意味を変えてしまうため |
| 入力漏れ判定 | 設定で OFF にできる | 定常枠の有効期間を予定期間として **常に含める**（設定は設けない） | 常設 WBS の鮮度パネルにしか効かず（判定はその WBS のタスクが基準）、案件側の表示は変わらないため |
| 定常枠の月按分 | 月の疑似タスクを既存按分へ | **日ごとに「月額 × 当日の稼働可能時間 ÷ その月の稼働可能時間合計」** を直接計算 | 有効期間が月の途中で始まっても自然に按分される。計算は専用ドメインサービスに閉じる |

### 11.2 データモデル

```prisma
enum ProjectKind { PROJECT STANDING }
enum StandingCategory { MAINTENANCE INTERNAL OTHER }
enum SteadyPlanUnit { PER_DAY PER_MONTH }

model Projects {
  kind     ProjectKind       @default(PROJECT)
  category StandingCategory? // STANDING のみ
}

model SteadyWorkPlan {            // @@map("steady_work_plan")
  id        Int            @id @default(autoincrement())
  taskId    Int            // WbsTask（onDelete: Cascade）
  unit      SteadyPlanUnit
  hours     Decimal
  validFrom DateTime       @db.Date
  validTo   DateTime?      @db.Date
  createdAt / updatedAt
  @@index([taskId, validFrom])
}
```

マイグレーションは `prisma/migrations/20261103000000_add_standing_project_and_steady_work_plan/`。既存行は `kind = PROJECT` になり挙動は変わらない。

### 11.3 層ごとの変更

| 層 | 追加・変更 |
|---|---|
| types | `src/types/project.ts`: `ProjectKind` / `StandingCategory`（`as const` + union、表示ラベル）、`Project` DTO に `kind` `category?`。`src/types/steady-work-plan.ts`: `SteadyPlanUnit`、`SteadyWorkPlanDto`、`SteadyWorkTaskDto` |
| domain | `Project`: `kind`（既定 `PROJECT`）・`category`（常設のみ。案件に付けると例外）・`isStanding()`。`src/domains/standing-work/steady-work-plan.ts`: 不変条件（`hours ≥ 0`、`validFrom ≤ validTo`）、`isActiveOn(date)`、`overlapsWith`、`assertNoOverlap`。`steady-work-allocation-service.ts`: 定常枠 → `DailyWorkAllocation[]`（`PER_DAY` は稼働日に固定値、`PER_MONTH` は月額を稼働可能時間比で按分。参画率は見ず rate=1 カレンダー、会社休日・全日休暇は 0）と、通常タスク分との日別マージ |
| application | `ISteadyWorkPlanRepository`（`findByWbsId` / `findActiveByWbsIds(range)` は所属タスクの id・名前・担当者 id を伴う読み取りモデルを返す）。`IStandingWorkApplicationService`（定常タスク一覧・定常タスク追加・定常枠の作成/更新/削除。常設以外の WBS・担当者なしタスク・期間重複は `{ success: false, error }`）。`ProjectApplicationService.createProject` に `kind` / `category`。`TargetWbsInfo` に `projectKind` を追加し、`PortfolioApplicationService` と `NotificationEventDetector` は `PROJECT` のみ対象。`CrossWbsWorkloadService` / `AssigneeGanttService` は定常枠を持つタスクを枠で配分し（YOTEI 按分の対象から外して二重計上を防ぐ）、枠のみの担当者も行に出す。`DataFreshnessApplicationService` は枠の有効期間を予定期間に加える |
| infrastructure | `SteadyWorkPlanRepository`（Prisma）。`ProjectRepository` / `TargetWbsQueryRepository` の種別マッピング。`EstimationAccuracyQueryRepository` / `DashboardQueryRepository` は `kind = PROJECT` に限定。DI 登録（`SYMBOL.ISteadyWorkPlanRepository`、`SYMBOL.IStandingWorkApplicationService`） |
| UI | プロジェクト作成フォームに種別（作成時のみ）と分類（常設のみ）。一覧に種別列と `?kind=` フィルタ。`WbsManagementContent` は常設のとき **サマリー / リスト / 定常枠 / 担当者ガント / 設定** のみ表示（タブ構成は純粋関数 `getWbsTabs(kind)` に切り出してテスト）。定常枠パネル `src/components/standing-work/steady-work-plan-panel.tsx` と Server Action `src/app/wbs/[id]/actions/steady-work-plan-actions.ts` |

### 11.4 テスト計画

| 層 | テスト |
|---|---|
| domain | `src/__tests__/domains/project/project.test.ts`（種別・分類の不変条件）、`src/__tests__/domains/standing-work/steady-work-plan.test.ts`、`steady-work-allocation-service.test.ts`（稼働日のみ・休日/全日休暇 0・月按分・有効期間の端・通常タスクとのマージ） |
| application | `src/__tests__/applications/standing-work/standing-work-application-service.test.ts`、既存の `cross-wbs-workload-service.test.ts` / `assignee-gantt.service.test.ts` / `portfolio-application-service.test.ts` / `notification-event-detector.test.ts` / `data-freshness-application-service.test.ts` / `project-application-service.test.ts` への追加 |
| UI | `src/__tests__/actions/steady-work-plan-actions.test.ts`、`src/__tests__/actions/projects-actions.test.ts`、`src/__tests__/components/wbs/wbs-tabs.test.ts`、`src/__tests__/components/standing-work/steady-work-plan-panel.test.tsx` |
| 統合 | `src/__integration_tests__/infrastructures/steady-work-plan-repository.test.ts`（往復・範囲交差・タスク削除時のカスケード） |

### 11.5 実装状況（2026-11-03）

| 項目 | 状況 |
|---|---|
| Step 1: 種別（`Projects.kind` / `category`）、プロジェクト作成・一覧の種別対応、案件分析からの除外（ポートフォリオ・通知・見積精度・ダッシュボード）、常設 WBS のタブ構成 | 実装済み |
| Step 2: 定常枠（`steady_work_plan`）、定常枠タブ（定常タスク追加・枠の追加/編集/削除）、担当者負荷（横断・WBS内・単一WBS）と他WBS考慮スケジューリングへの反映、入力漏れ判定への反映 | 実装済み |
| Step 3: 予定／実績の切替表示・実績タブ・「割込み作業を追加」 | 未着手（単発タスクは既存のタスク登録で代替） |
| Step 4: 保守契約の工数管理・Geppo 別名表 | 未着手 |
| §9.1 Geppo の案件外行の取込挙動 | 未修正（別タスク） |
