# 計画書: Outlook 予定表エクスポートからのスケジュールインポート

## 1. 背景と目的

- 現状、個人スケジュール（`user_schedule`）は旧システムが出力する TSV（`userSchedule.txt`。列: 個人ｺｰﾄﾞ/氏名/年月日/開始時間/終了時間/ﾀｲﾄﾙ/場所/内容）を `/schedule/import` から取り込んでいる。
- 運用が Outlook の予定表に移行したため、**Outlook からエクスポートした予定表データ**を取り込めるようにする。
- 取り込んだ予定は既存どおり、稼働可能時間の計算（`AssigneeWorkingCalendar`）・共通空き時間検索（`FreeTimeSlotService`）・スケジュールカレンダー表示で使われる。

## 2. 対象とする入力形式

クラシック Outlook の「ファイル > 開く/エクスポート > インポート/エクスポート > ファイルにエクスポート > テキスト ファイル (コンマ区切り)」で出力される **予定表の CSV**。

- Outlook の CSV エクスポートは**期間を指定でき、定期的な予定も1件ずつ展開されて出力される**ため、繰り返しルール（RRULE）の展開が不要。
- iCalendar（.ics）は繰り返しルールやタイムゾーン定義の解釈が必要になるため本計画の対象外（将来拡張。§8）。

### 2.1 列（日本語版/英語版の両方に対応。列の順序は問わない）

| 用途 | 日本語版の列名 | 英語版の列名 | 必須 |
|---|---|---|---|
| タイトル | 件名 | Subject | ○ |
| 開始日 | 開始日 | Start Date | ○ |
| 開始時刻 | 開始時刻 | Start Time | |
| 終了日 | 終了日 | End Date | |
| 終了時刻 | 終了時刻 | End Time | |
| 終日 | 終日イベント | All day event | |
| 場所 | 場所 | Location | |
| 内容 | 内容 / 説明 | Description | |
| 公開方法 | 公開する時間帯の種類 / 公開方法 | Show time as | |

上記以外の列（出席者、アラーム等）は無視する。

### 2.2 値の形式

- 日付: `YYYY/M/D`・`YYYY-M-D`（日本語版）、`M/D/YYYY`（英語版）
- 時刻: `H:mm`・`H:mm:ss`（24時間）、`h:mm[:ss] AM/PM`、`午前/午後 h:mm[:ss]`
- 終日: `TRUE`/`True`/`1`/`はい`/`オン`/`Yes` を真とみなす。終日列が無く開始/終了時刻が空の行も終日扱い
- 公開方法: Outlook の CSV エクスポートで観測される数値コード、または表示名
  - `0`=他の場所で作業中 / `1`=仮の予定 / `2`=予定あり / `3`=空き時間 / `4`=外出中
  - 空・不明値は「予定あり」とみなす（安全側）
  - 注: VBA の `OlBusyStatus` 列挙（0=空き時間, 3=外出中）と CSV の値は一致しないとの報告があるため、CSV の観測値を採用する
- 文字コード: Shift_JIS（日本語版 Outlook の既定）/ UTF-8（BOM 有無とも）を自動判定

## 3. 取り込みルール（ドメインルール）

1. **時刻はファイルに書かれた壁時計時刻のまま扱う**（既存 TSV と同じく `startTime`/`endTime` は `HH:mm`、`date` は UTC 0 時の日付）。
2. **稼働を妨げない予定は取り込まない**: 公開方法が「空き時間」「他の場所で作業中」の予定はスキップする。
   - Outlook では終日の予定の既定値が「空き時間」のため、記念日・リリース日などの情報だけの終日予定が稼働時間を潰さない。
   - ただしタイトルが全休タイトル（`休暇`・`有給` 等。`FULL_DAY_OFF_TITLES`）の予定は、公開方法に関係なく取り込む。
3. **終日の予定**は対象日ごとに `00:00`〜`24:00` の予定とする（Outlook の終日予定は終了日が翌日 0:00 の排他終了）。
4. **日をまたぐ予定**は日ごとに分割する（初日: 開始〜`24:00`、中日: `00:00`〜`24:00`、最終日: `00:00`〜終了。最終日の終了が `00:00` なら最終日は作らない）。
5. 終了が開始より前の予定、期間が 366 日を超える予定、日付・時刻が解釈できない行はエラー行としてスキップし、行番号と理由を返す。

## 4. 置換範囲（既存データとの関係）

- Outlook の予定表は**個人単位**のため、取り込み先ユーザーを画面で選択する（CSV にユーザーを識別する列はない）。
- **選択ユーザーの、ファイル内の予定がカバーする期間（最小日〜最大日）のスケジュールだけを削除して置き換える**。他ユーザーや期間外のスケジュールは保持する。
  - 同じ期間を再エクスポートして再取り込みすれば、Outlook 側での変更・削除がそのまま反映される（冪等）。
  - 期間はスキップした予定（空き時間等）も含めて算出する。
- 有効な予定が1件もない場合は何も削除せずエラーとする。
- 既存の TSV インポート（全ユーザー全件置換）は従来どおり残す。

## 5. 設計（オニオンアーキテクチャ）

```text
UI  /schedule/import (page.tsx: Server Component でユーザー一覧取得)
 ├─ _components/outlook-import-form.tsx   ユーザー選択 + ファイル選択（react-hook-form + zod）
 ├─ _components/outlook-csv.ts            CSV テキスト → 列名を正規化した行DTO（必要列だけに絞って送信量を削減）
 ├─ _components/tsv-import-form.tsx       既存 TSV 取込（page.tsx から移設）
 └─ src/utils/text-decoding.ts            Shift_JIS / UTF-8 自動判定
      ↓ Server Action importOutlookSchedule（Zod 検証, ActionResult, revalidatePath）
Application  ScheduleApplicationService.importOutlookSchedules
 └─ outlook-calendar-row-parser.ts        行DTO → CalendarEvent（日付時刻形式・公開方法の解釈）
      ↓
Domain  CalendarEvent（値オブジェクト）
 ├─ isBlocking()            稼働を妨げる予定か（ルール2）
 ├─ toDailySchedules()      日ごとの UserSchedule へ分割（ルール3,4）
 └─ coveredDateRange()      置換範囲の算出（§4）
      ↓
Infrastructure  UserScheduleRepository.replaceByUserIdAndDateRange（トランザクションで削除→一括作成）
```

- 列名（日本語/英語の別名）の解決はファイル読込時（UI）に行い、Server Action には列名を正規化した行DTO（`OutlookCalendarRowDto`、`src/types/outlook-calendar.ts`）を送る。Server Action の境界で行の形を Zod で厳密に検証でき、値（日付・時刻・公開方法）の解釈はアプリ層に集約される。
- Server Action の本文上限（既定 1MB）に配慮し、必要列だけを送る（出席者一覧などの大きな列を落とす）。

## 6. 取り込み結果（画面表示）

- 取り込んだ予定数・作成したスケジュール数（日分割後）・スキップ数（空き時間等）・置換した期間
- エラー行（行番号と理由。最大 20 件を表示）

## 7. TDD の進め方（各ステップでテスト先行コミット → 実装コミット）

| Step | 対象 | テスト |
|---|---|---|
| 1 | Domain `CalendarEvent` | `src/__tests__/domains/calendar/calendar-event.test.ts` |
| 2 | Application 行パーサー | `src/__tests__/applications/schedule/outlook-calendar-row-parser.test.ts` |
| 3 | Repository / Application Service / Server Action | `user-schedule-repository.test.ts`・`schedule-application-service.test.ts`・`src/__tests__/actions/schedule-actions.test.ts` |
| 4 | UI（文字コード判定・CSV 行変換・フォーム） | `src/__tests__/utils/text-decoding.test.ts`・`src/__tests__/app/schedule/*.test.ts(x)` |

## 8. 対象外・今後の課題

- iCalendar（.ics）形式の取り込み（RRULE 展開・VTIMEZONE 解釈が必要）
- Microsoft Graph API による予定表の自動同期
- 全休タイトルの設定化（`FULL_DAY_OFF_TITLES` の TODO）
- 「公開方法」の数値コードは公式仕様が見当たらないため、実データで差異が見つかった場合は `outlook-calendar-row-parser.ts` のマッピングを修正する
