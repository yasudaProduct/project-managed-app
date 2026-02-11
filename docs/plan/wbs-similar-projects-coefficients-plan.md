# WBS類似案件タグ・係数指標・工程割合 方針ドキュメント

日付: 2026-02-10
ステータス: Draft

---

## 1. 概要

本ドキュメントでは、以下3機能の設計方針を定める。

| # | 機能 | 目的 |
|---|------|------|
| A | 類似案件タグ | WBSに「WEB新規」「DBリプレイス」等のタグを付与し、他機能でのフィルタに利用 |
| B | フェーズ係数指標 | 基準工程（例: 基本設計=1）に対する各工程の工数比率を表示。見積もり時の係数見積法の参考値 |
| C | 全工程実績割合 | 全体工数に対する特定工程の割合を表示。PM工数＝開発工数×0.2 のような見積りの参考値 |

B・Cは共通して「選択したWBS」「全体」「類似案件」でフィルタ可能とする。

---

## 2. 前提課題: 工程マッピング問題

### 2.1 現状の問題

現在の工程（Phase）管理は二層構造になっている。

```
PhaseTemplate (マスタ)      WbsPhase (WBS個別)
┌──────────────────┐       ┌──────────────────┐
│ id: 1            │       │ id: 10           │
│ name: "基本設計"  │  →?   │ name: "基本設計"  │
│ code: "BD"       │       │ code: "BD"       │
│ seq: 1           │       │ wbsId: 1         │
└──────────────────┘       └──────────────────┘
```

**問題点:**
- `WbsPhase`はテンプレートからの作成も自由入力も可能
- `WbsPhase`に`PhaseTemplate`への参照（FK）が存在しない
- テンプレートから作成してもname/codeを変更可能
- 結果として、同一工程でもWBS間で`code`や`name`に表記ゆれが発生し得る

**例:**
| WBS | name | code |
|-----|------|------|
| WBS-A | 基本設計 | BD |
| WBS-B | 基本設計 | BASIC_DESIGN |
| WBS-C | BD（基本設計） | BD01 |

このままでは複数WBS間の工程を正しくマッピングして集計できない。

### 2.2 解決方針: PhaseTemplateへの紐付け必須化

#### 方針

`WbsPhase`に`PhaseTemplate`への参照（`templateId`）を追加し、集計対象の工程は必ずテンプレートに紐付ける。

```
WbsPhase
┌─────────────────────┐
│ id: 10              │
│ wbsId: 1            │
│ templateId: 1  ← 追加│
│ name: "基本設計"     │
│ code: "BD"          │
│ seq: 1              │
└─────────────────────┘
       │
       ▼
PhaseTemplate
┌──────────────────┐
│ id: 1            │
│ name: "基本設計"  │
│ code: "BD"       │
│ seq: 1           │
└──────────────────┘
```

#### 詳細設計

1. **DBスキーマ変更**
   - `wbs_phase`テーブルに`templateId`カラム(nullable)を追加
   - `PhaseTemplate`へのFK制約を設定

   ```prisma
   model WbsPhase {
     id         Int             @id @default(autoincrement())
     wbsId      Int
     templateId Int?            // ← 追加
     name       String
     code       String
     seq        Int
     wbs        Wbs             @relation(fields: [wbsId], references: [id])
     template   PhaseTemplate?  @relation(fields: [templateId], references: [id])
     tasks      WbsTask[]
     createdAt  DateTime        @default(now()) @db.Timestamptz
     updatedAt  DateTime        @updatedAt @db.Timestamptz

     @@map("wbs_phase")
   }
   ```

2. **WBS工程入力の変更**
   - テンプレートから選択した場合: `templateId`を自動設定。`name`と`code`はテンプレートの値をコピーするが、**表示名として**WBS側での上書きを許容する
   - 自由入力の場合: `templateId = null`。集計対象外として扱う
   - UI上の変更: 工程作成フォームに「テンプレート未紐付けの場合、クロスWBS集計の対象外になります」旨の注意書きを表示

3. **集計時のマッピングロジック**
   - `templateId`が同一の`WbsPhase`同士を同一工程として扱う
   - `templateId = null`の工程は「その他」としてまとめるか、集計対象外とする

4. **既存データの移行**
   - マイグレーション時に、既存`WbsPhase`の`code`が`PhaseTemplate.code`と完全一致するものを自動的に`templateId`へ紐付け
   - 一致しないものは`templateId = null`のまま残し、手動紐付けを促す

#### 代替案（不採用）

| 案 | 内容 | 不採用理由 |
|----|------|-----------|
| code一致で集計 | WbsPhase.codeが同じものを同一工程として扱う | 表記ゆれを防げない。`BD` vs `BD01`等 |
| 自由入力禁止 | テンプレートからの選択のみ許可 | 柔軟性が失われ、既存運用に影響 |
| 後からマッピングUI | 集計画面で手動マッピング | UX複雑、毎回マッピング作業が必要 |

---

## 3. 機能A: 類似案件タグ

### 3.1 要件

- WBSごとに1つ以上のタグを設定可能
- タグは「WEB新規」「DBリプレイス」「インフラ構築」等の自由テキスト
- マスタテーブルは設けない（タグは使用実績から自動的に候補として表示）
- WBS編集画面で新規追加 or 既存から選択
- 他機能（係数指標、工程割合）のフィルタ条件として使用

### 3.2 DBスキーマ

```prisma
model WbsTag {
  id        Int      @id @default(autoincrement())
  wbsId     Int
  name      String
  wbs       Wbs      @relation(fields: [wbsId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @db.Timestamptz

  @@unique([wbsId, name])
  @@map("wbs_tag")
}
```

**設計判断:**
- マスタテーブルを設けず、`WbsTag`テーブルのみで管理
- 既存タグの候補は `SELECT DISTINCT name FROM wbs_tag` で取得
- WBSとタグは1対多（1つのWBSに複数タグ）
- `@@unique([wbsId, name])` で同一WBS内のタグ重複を防止
- `onDelete: Cascade` でWBS削除時にタグも削除

### 3.3 ドメインモデル

```
src/domains/wbs/
├── wbs.ts              ← 既存を拡張
└── wbs-tag.ts          ← 新規
```

```typescript
// src/domains/wbs/wbs-tag.ts
export class WbsTag {
  public readonly id?: number;
  public readonly wbsId: number;
  public name: string;

  static create(args: { wbsId: number; name: string }): WbsTag;
  static createFromDb(args: { id: number; wbsId: number; name: string }): WbsTag;
}
```

### 3.4 アプリケーション層

```typescript
// src/applications/wbs/wbs-tag-application-service.ts
interface IWbsTagRepository {
  findByWbsId(wbsId: number): Promise<WbsTag[]>;
  findAllDistinctNames(): Promise<string[]>;
  addTag(wbsId: number, name: string): Promise<WbsTag>;
  removeTag(wbsId: number, name: string): Promise<void>;
  findWbsIdsByTagNames(tagNames: string[]): Promise<number[]>;
}
```

### 3.5 UI設計

WBS編集画面（`/wbs/[id]`）にタグセクションを追加。

```
┌─────────────────────────────────────────┐
│ WBS名: [プロジェクトA WBS        ]       │
│                                         │
│ 類似案件タグ:                            │
│ ┌──────────┐ ┌──────────┐              │
│ │ WEB新規 ✕│ │ EC構築  ✕│              │
│ └──────────┘ └──────────┘              │
│ ┌──────────────────────────┐            │
│ │ タグを追加...       ▼    │            │
│ └──────────────────────────┘            │
│   候補: DBリプレイス | インフラ | API開発   │
└─────────────────────────────────────────┘
```

**入力コンポーネント:**
- 既存の`Command`コンポーネント（Combobox）を活用
- 入力テキストに部分一致する既存タグを候補表示
- 候補にない場合は入力テキストで新規タグを作成
- 追加済みタグは`Badge`コンポーネント + 削除ボタンで表示

---

## 4. 機能B: フェーズ係数指標

### 4.1 要件

- 基準工程（例: 基本設計）を1.0とした場合の各工程の工数比率を表示
- フィルタ: 選択したWBS / 全体 / 類似案件
- 用途: 案件見積もりにおける係数見積法の参考値

### 4.2 計算ロジック

```
係数 = 対象工程の合計工数 / 基準工程の合計工数
```

**集計対象の工数:**
- 予定工数（`yoteiKosu`）と実績工数（`jissekiKosu`）を切り替え可能
- 工数は`WbsTask`に紐づく`TaskKosu`（type: NORMAL）と`WorkRecord.hours_worked`から取得

**集計粒度:**

| フィルタ | 集計範囲 |
|---------|---------|
| 選択WBS | 指定WBSの工程別工数から算出 |
| 全体 | 全WBSの`templateId`でグループ化し合算 |
| 類似案件 | 指定タグを持つWBSの`templateId`でグループ化し合算 |

### 4.3 画面設計

```
┌─────────────────────────────────────────────────────┐
│ フェーズ係数指標                                      │
│                                                     │
│ フィルタ: ○選択WBS  ○全体  ○類似案件                  │
│ 類似案件: [WEB新規 ▼]  (類似案件選択時のみ表示)        │
│ 基準工程: [基本設計 ▼]                                │
│ 工数種別: ○予定(YOTEI)  ○実績(JISSEKI)               │
│                                                     │
│ ┌──────────┬──────┬──────┬──────┬──────┐            │
│ │ 工程     │ 合計 │ 係数 │ WBS数│ 備考 │            │
│ ├──────────┼──────┼──────┼──────┼──────┤            │
│ │ 要件定義 │  120h│  0.6 │   5  │      │            │
│ │ 基本設計 │  200h│  1.0 │   5  │ 基準 │            │
│ │ 詳細設計 │  300h│  1.5 │   5  │      │            │
│ │ 実装     │  600h│  3.0 │   5  │      │            │
│ │ テスト   │  400h│  2.0 │   4  │      │            │
│ │ 未分類   │   50h│  0.25│   2  │ ※1  │            │
│ └──────────┴──────┴──────┴──────┴──────┘            │
│                                                     │
│ ※1: templateId未設定の工程は「未分類」に集約           │
└─────────────────────────────────────────────────────┘
```

**補足列:**
- **WBS数**: 集計に含まれるWBS数（フィルタ条件に一致し、当該工程のデータを持つWBS数）
- **備考**: 基準工程マーク、注意事項等

### 4.4 ドメインサービス

```typescript
// src/domains/wbs/phase-coefficient.service.ts

export type PhaseCoefficient = {
  templateId: number | null;
  phaseName: string;
  phaseCode: string;
  totalHours: number;
  coefficient: number;
  wbsCount: number;
  isBase: boolean;
};

export class PhaseCoefficientService {
  /**
   * 基準工程に対する各工程の係数を計算する
   */
  static calculate(
    phaseHours: { templateId: number | null; phaseName: string; phaseCode: string; totalHours: number; wbsCount: number }[],
    baseTemplateId: number
  ): PhaseCoefficient[];
}
```

---

## 5. 機能C: 全工程実績割合

### 5.1 要件

- 全工程の合計工数に対する各工程の割合を表示
- 特定工程群の合計に対する割合も表示可能（例: 「開発工程」の合計に対するレビュー割合）
- フィルタ: 選択したWBS / 全体 / 類似案件

### 5.2 計算ロジック

```
割合 = 対象工程の合計工数 / 母数の合計工数

母数:
- 「全体」: 全工程の合計
- 「カスタム」: ユーザーが選択した工程群の合計
```

**ユースケース例:**
- 全体に対するPM工程の割合 → `PM工数 / 全工程合計 = 0.15 (15%)`
- 開発工程（設計+実装+テスト）に対するレビュー割合 → `レビュー工数 / (設計+実装+テスト) = 0.20 (20%)`

### 5.3 画面設計

```
┌─────────────────────────────────────────────────────────┐
│ 工程実績割合                                             │
│                                                         │
│ フィルタ: ○選択WBS  ○全体  ○類似案件                     │
│ 類似案件: [WEB新規 ▼]                                    │
│ 工数種別: ○予定(YOTEI)  ○実績(JISSEKI)                   │
│                                                         │
│ ─── 全体に対する割合 ───                                  │
│ ┌────────────┬──────┬──────┬───────────────┐            │
│ │ 工程       │ 合計 │ 割合 │ ████████      │            │
│ ├────────────┼──────┼──────┼───────────────┤            │
│ │ PM         │  150h│  8.8%│ ███           │            │
│ │ 要件定義   │  120h│  7.1%│ ███           │            │
│ │ 基本設計   │  200h│ 11.8%│ ████          │            │
│ │ 詳細設計   │  300h│ 17.6%│ ██████        │            │
│ │ 実装       │  600h│ 35.3%│ ████████████  │            │
│ │ テスト     │  280h│ 16.5%│ ██████        │            │
│ │ レビュー   │   50h│  2.9%│ █             │            │
│ │ 合計       │ 1700h│  100%│               │            │
│ └────────────┴──────┴──────┴───────────────┘            │
│                                                         │
│ ─── カスタム母数での割合 ───                               │
│ 母数工程: [☑基本設計 ☑詳細設計 ☑実装 ☑テスト]              │
│ ┌────────────┬──────┬──────────────────────┐            │
│ │ 工程       │ 合計 │ 対母数割合            │            │
│ ├────────────┼──────┼──────────────────────┤            │
│ │ 基本設計   │  200h│ 14.5%                │            │
│ │ 詳細設計   │  300h│ 21.7%                │            │
│ │ 実装       │  600h│ 43.5%                │            │
│ │ テスト     │  280h│ 20.3%                │            │
│ │ 母数合計   │ 1380h│ 100%                 │            │
│ │ ────────── │──────│──────────────────────│            │
│ │ レビュー   │   50h│  3.6% (対母数)        │            │
│ │ PM         │  150h│ 10.9% (対母数)        │            │
│ └────────────┴──────┴──────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 5.4 ドメインサービス

```typescript
// src/domains/wbs/phase-proportion.service.ts

export type PhaseProportion = {
  templateId: number | null;
  phaseName: string;
  phaseCode: string;
  totalHours: number;
  proportion: number;       // 全体に対する割合 (0.0 ~ 1.0)
  customProportion?: number; // カスタム母数に対する割合
};

export class PhaseProportionService {
  static calculate(
    phaseHours: { templateId: number | null; phaseName: string; phaseCode: string; totalHours: number }[],
    customBaseTemplateIds?: number[]
  ): PhaseProportion[];
}
```

---

## 6. 共通: クロスWBS工数集計クエリ

機能B・Cの基盤となるクロスWBS集計クエリの設計。

### 6.1 リポジトリインターフェース

```typescript
// src/applications/wbs/interfaces/wbs-cross-query-repository.ts

export type PhaseHoursSummary = {
  templateId: number | null;
  phaseName: string;
  phaseCode: string;
  totalPlannedHours: number;   // yoteiKosu合計
  totalActualHours: number;    // jissekiKosu合計 (work_records)
  wbsCount: number;            // 対象WBS数
};

export interface IWbsCrossQueryRepository {
  /**
   * 指定WBS群の工程別工数集計を取得
   * @param wbsIds 対象WBS IDリスト。空の場合は全WBS
   */
  getPhaseHoursSummary(wbsIds?: number[]): Promise<PhaseHoursSummary[]>;
}
```

### 6.2 SQLイメージ

```sql
SELECT
  wp.template_id,
  COALESCE(pt.name, wp.name) AS phase_name,
  COALESCE(pt.code, wp.code) AS phase_code,
  SUM(yotei_kosu.kosu)       AS total_planned_hours,
  SUM(wr_agg.hours_worked)   AS total_actual_hours,
  COUNT(DISTINCT wp.wbs_id)  AS wbs_count
FROM wbs_phase wp
LEFT JOIN phase_template pt ON pt.id = wp.template_id
JOIN wbs_task wt ON wt.phase_id = wp.id
LEFT JOIN LATERAL (
  SELECT SUM(tk.kosu) AS kosu
  FROM task_period tp
  JOIN task_kosu tk ON tk.period_id = tp.id AND tk.type = 'NORMAL'
  WHERE tp.task_id = wt.id AND tp.type = 'YOTEI'
) yotei_kosu ON true
LEFT JOIN LATERAL (
  SELECT SUM(wr.hours_worked) AS hours_worked
  FROM work_records wr
  WHERE wr.task_id = wt.id
) wr_agg ON true
WHERE wp.wbs_id = ANY(:wbsIds)  -- フィルタ条件
GROUP BY wp.template_id, phase_name, phase_code
ORDER BY MIN(wp.seq);
```

---

## 7. ページ構成・ルーティング

### 7.1 新規ページ

| パス | 内容 |
|------|------|
| `/wbs/analytics` | 分析トップ（係数指標・工程割合の統合ページ） |

タブ構成:
- **係数指標**: 機能B
- **工程割合**: 機能C

### 7.2 既存ページの変更

| パス | 変更内容 |
|------|---------|
| `/wbs/[id]` | タグセクション追加（機能A） |
| `/wbs/[id]/phase/new` | テンプレート選択時に`templateId`を保持 |

---

## 8. 実装計画

### Phase 1: 基盤整備（工程マッピング + タグ）

1. **DBマイグレーション**
   - `wbs_phase`に`templateId`カラム追加
   - `wbs_tag`テーブル作成
   - 既存データの`templateId`自動マッピング（code一致）

2. **ドメインモデル更新**
   - `Phase`ドメインに`templateId`プロパティ追加
   - `WbsTag`ドメインモデル新規作成

3. **リポジトリ更新**
   - `PhaseRepository`の`templateId`対応
   - `WbsTagRepository`新規作成

4. **UI更新**
   - WBS工程作成フォームの`templateId`対応
   - WBS編集画面へのタグセクション追加

### Phase 2: 係数指標・工程割合

5. **集計クエリ実装**
   - `WbsCrossQueryRepository`新規作成
   - クロスWBS工程別工数集計

6. **ドメインサービス実装**
   - `PhaseCoefficientService`
   - `PhaseProportionService`

7. **アプリケーション層**
   - `WbsAnalyticsHandler`（集計→計算→レスポンス整形）

8. **UI実装**
   - `/wbs/analytics`ページ
   - 係数指標テーブルコンポーネント
   - 工程割合テーブル + バーチャートコンポーネント
   - フィルタUI（WBS選択・タグフィルタ・工数種別切替）

---

## 9. テスト方針

TDDに則り、各フェーズで以下のテストを先行して作成する。

### ユニットテスト
- `PhaseCoefficientService.calculate()`: 基準工程に対する係数計算の正確性
  - 基準工程の工数が0の場合のエッジケース
  - `templateId = null`の工程の「未分類」集約
- `PhaseProportionService.calculate()`: 割合計算の正確性
  - 全体母数、カスタム母数
  - 工数0の工程の扱い
- `WbsTag`ドメインモデル: バリデーション

### 統合テスト
- `WbsCrossQueryRepository`: 複数WBS跨ぎの集計結果が正しいこと
- `WbsTagRepository`: タグのCRUD、重複防止、候補取得
- `PhaseRepository`: `templateId`紐付けの永続化

---

## 10. 影響範囲

### DB変更
- `wbs_phase`テーブル: `templateId`カラム追加（nullable、FK）
- `wbs_tag`テーブル: 新規作成
- `PhaseTemplate`モデル: `WbsPhase`へのリレーション追加

### 既存機能への影響
- WBS工程作成/編集: `templateId`フィールド追加（UI・サーバーアクション）
- WBS集計（`get-wbs-summary-handler.ts`）: 変更なし（既存集計は単一WBS内なので影響なし）
- `PhaseCode`バリデーション: 変更なし

### 非破壊的変更
- `templateId`はnullableのため、既存データ・機能に破壊的影響はない
- タグ機能は完全な新規追加
- 分析ページは新規ページのため既存画面への影響なし
