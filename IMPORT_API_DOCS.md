# インポートAPI ドキュメント

## 概要

外部のWBSデータ（MySQL の `wbs` テーブル）と実績（Geppo）を取り込む **インポートジョブ** のAPIです。

- 呼び出し元を問いません。画面・定期インポート（cron）・Jenkins・curl のいずれからでも、同じAPIでインポートを実行できます。定期インポートの設定には依存しません。
- **ジョブを作成するとインポートが実行されます。** 作成したジョブは実行待ち（`PENDING`）になり、実行中のジョブがなければ直ちに開始されます。
- **ジョブは作成順に1件ずつ実行されます（並行実行はしません）。** 実行中のジョブが終わると、次の実行待ちジョブが自動で開始されます。
  - WBSの洗い替えと実績取込を同時に行う、同じ対象を二重に取り込む、といった並行実行ではデータが壊れるためです。
- 30分以上 `RUNNING` のままのジョブ（アプリの再起動などで処理が中断されたもの）は、タイムアウトとして `FAILED` になります。

### ジョブの状態

| 状態 | 説明 |
|---|---|
| `PENDING` | 実行待ち |
| `RUNNING` | 実行中（同時に1件まで） |
| `COMPLETED` | 完了 |
| `FAILED` | 失敗（`errorDetails` に原因） |
| `CANCELLED` | キャンセル（`PENDING` / `RUNNING` から） |

### 認証

インポートジョブAPI（`/api/import-jobs`）は現在認証なしです。アプリをネットワークで保護してください。
定期インポートの起動API（`/api/cron/import-schedules`）のみ `CRON_SECRET` による認証があります。

### レスポンス形式

成功: `{ "success": true, "data": ..., "message"?: string, "timestamp": string }`
失敗: `{ "success": false, "error": string, "errors"?: ..., "timestamp": string }`

日時はすべて ISO 8601（UTC）です。

## エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/import-jobs` | ジョブを作成する（＝インポートを実行する） |
| GET | `/api/import-jobs/{id}` | ジョブの状態・結果を取得する |
| GET | `/api/import-jobs` | ジョブ一覧を取得する（`?status=PENDING` / `?status=RUNNING` / `?userId=`） |
| POST | `/api/import-jobs/{id}/execute` | 実行待ちのジョブを今すぐ開始する（通常は不要） |
| POST | `/api/import-jobs/{id}/cancel` | ジョブをキャンセルする |
| DELETE | `/api/import-jobs/{id}` | 実行中でないジョブを削除扱い（未完了ならキャンセル）にする |
| GET | `/api/import-jobs/{id}/stream` | 進捗を Server-Sent Events で受け取る |
| POST | `/api/cron/import-schedules` | 定期インポートを起動する（cron から毎分呼ぶ。`CRON_SECRET` 必須） |

## ジョブの作成（インポートの実行）

**POST** `/api/import-jobs`

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `type` | `"WBS"` \| `"GEPPO"` | ✓ | WBS同期 / 実績（Geppo）取込 |
| `wbsId` | number | WBS は ✓ | 対象WBSのID。GEPPO では任意（指定すると完了通知がそのWBSの担当者に届く） |
| `targetMonth` | string | | GEPPO の対象月（`YYYY-MM`）。省略時は全期間 |
| `targetProjectIds` | string[] | | GEPPO の対象WBS名（Geppo の `PROJECT_ID` と完全一致で照合）。省略時は全プロジェクト |
| `options` | object | | WBS: `{ "syncMode": "diff" \| "replace" }`（既定 `diff`）。GEPPO: `{ "dryRun": true }` で保存せずに検証のみ |

- `syncMode`
  - `diff`（差分）: タスクNoで照合して追加・更新・削除します。既存タスクと実績の紐付けは保たれます。
  - `replace`（洗い替え）: WBSのタスクをすべて削除して作り直します。**実績とタスクの紐付けが外れる**ため、続けて実績（GEPPO）を取り込み直してください。
- GEPPO は対象月・対象WBSの実績を置き換えます（`replace`）。

### レスポンス

`201 Created`（ジョブを作成した時点で返ります。完了は待ちません）

```json
{
  "success": true,
  "data": {
    "id": "cmvmqszxr000s7dgcblgfhe3z",
    "type": "WBS",
    "status": "PENDING",
    "createdAt": "2026-10-24T18:39:01.000Z"
  },
  "timestamp": "2026-10-24T18:39:01.010Z"
}
```

`400 Bad Request`（入力不正。例: WBS で `wbsId` がない、`targetMonth` が `YYYY-MM` でない）

```json
{
  "success": false,
  "error": "リクエストが不正です",
  "errors": { "wbsId": ["WBSのインポートには wbsId が必要です"] },
  "timestamp": "2026-10-24T18:39:01.010Z"
}
```

## ジョブの状態・結果の取得

**GET** `/api/import-jobs/{id}`

```json
{
  "success": true,
  "data": {
    "id": "cmvmqszxr000s7dgcblgfhe3z",
    "type": "WBS",
    "status": "COMPLETED",
    "progress": 0,
    "totalRecords": 0,
    "processedRecords": 0,
    "successCount": 0,
    "errorCount": 0,
    "createdAt": "2026-10-24T18:39:01.000Z",
    "startedAt": "2026-10-24T18:39:01.100Z",
    "completedAt": "2026-10-24T18:39:02.000Z",
    "wbsId": 1,
    "errorDetails": null,
    "result": { "recordCount": 21, "addedCount": 0, "updatedCount": 21, "deletedCount": 0 }
  },
  "timestamp": "2026-10-24T18:39:05.000Z"
}
```

`status` が `COMPLETED` / `FAILED` / `CANCELLED` になれば終了です。`404` はジョブが存在しない場合です。

## 実行待ちのジョブを今すぐ開始

**POST** `/api/import-jobs/{id}/execute`

ジョブは作成時に自動で開始・順番待ちされるため、通常は呼ぶ必要はありません。

| ステータス | 説明 |
|---|---|
| `200` | 開始した（`{ "started": true, "queued": false }`） |
| `202` | 他のジョブが実行中のため実行待ちのまま。完了後に順番に開始される（`{ "started": false, "queued": true }`） |
| `404` | ジョブが存在しない |
| `409` | 実行待ちのジョブではない（既に開始・終了・キャンセル済み） |

## 定期インポートの起動

**POST** `/api/cron/import-schedules`（ヘッダー `Authorization: Bearer <CRON_SECRET>`）

WBS画面の「設定」タブで設定した定期インポートのうち、期限が来たものをジョブとして登録し、実行待ちのジョブを開始します。cron コンテナ（`docker/cron/run-import-scheduler.sh`）が毎分呼び出します。

```json
{ "success": true, "data": { "isSkipped": false, "createdJobIds": ["cmv..."] }, "timestamp": "..." }
```

`isSkipped: true` は、システム設定で定期インポートが停止中のためジョブを作成しなかったことを表します。

## 使用例

### curl

```bash
BASE_URL=http://localhost:3000

# WBS（ID: 1）を差分同期する
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"type":"WBS","wbsId":1,"options":{"syncMode":"diff"}}' \
  "$BASE_URL/api/import-jobs"

# WBS「新規機能開発A」の 2026-09 の実績を取り込む
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"type":"GEPPO","wbsId":1,"targetMonth":"2026-09","targetProjectIds":["新規機能開発A"]}' \
  "$BASE_URL/api/import-jobs"

# 全プロジェクトの 2026-09 の実績を取り込む
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"type":"GEPPO","targetMonth":"2026-09"}' \
  "$BASE_URL/api/import-jobs"

# 状態を確認する
curl -s "$BASE_URL/api/import-jobs/<ジョブID>"
```

### 完了まで待つ（シェルスクリプト）

```bash
#!/bin/bash
set -e
BASE_URL="${BASE_URL:-http://localhost:3000}"

job_id=$(curl -sf -X POST -H 'Content-Type: application/json' \
  -d '{"type":"WBS","wbsId":1}' "$BASE_URL/api/import-jobs" \
  | grep -o '"id":"[^"]*"' | head -n 1 | cut -d '"' -f4)

for _ in $(seq 1 60); do
  status=$(curl -sf "$BASE_URL/api/import-jobs/$job_id" \
    | grep -o '"status":"[^"]*"' | head -n 1 | cut -d '"' -f4)
  case "$status" in
    COMPLETED) echo "completed"; exit 0 ;;
    FAILED|CANCELLED) echo "finished with $status"; exit 1 ;;
  esac
  sleep 30
done
echo "timeout"; exit 2
```

### Jenkins（Declarative Pipeline）

```groovy
pipeline {
  agent any
  environment { BASE_URL = 'http://app.example.local:3000' }
  stages {
    stage('Import') {
      steps {
        script {
          def created = readJSON text: httpRequest(
            httpMode: 'POST',
            url: "${BASE_URL}/api/import-jobs",
            contentType: 'APPLICATION_JSON',
            requestBody: '{"type":"WBS","wbsId":1,"options":{"syncMode":"diff"}}',
            validResponseCodes: '201'
          ).content
          def jobId = created.data.id

          timeout(time: 30, unit: 'MINUTES') {
            waitUntil(initialRecurrencePeriod: 15000) {
              def job = readJSON text: httpRequest(url: "${BASE_URL}/api/import-jobs/${jobId}").content
              if (job.data.status in ['FAILED', 'CANCELLED']) {
                error("Import job ${jobId} finished with ${job.data.status}")
              }
              return job.data.status == 'COMPLETED'
            }
          }
        }
      }
    }
  }
}
```
