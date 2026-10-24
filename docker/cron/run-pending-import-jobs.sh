#!/bin/bash

# 保留中（PENDING）のインポートジョブを列挙し、順次実行するcronスクリプト

set -e

LOG_FILE="/var/log/cron/run-pending-import-jobs.log"
. "$(dirname "${BASH_SOURCE[0]}")/import-job-common.sh"

SLEEP_BETWEEN_TRIGGERS="${SLEEP_BETWEEN_TRIGGERS:-2}"
MAX_TO_TRIGGER="${MAX_TO_TRIGGER:-50}"

log "Checking for pending import jobs..."

# 保留中ジョブの取得
http_request GET "$API_BASE_URL/api/import-jobs?status=PENDING"
if [ "$HTTP_STATUS" != "200" ]; then
  log "ERROR: Failed to fetch pending jobs (HTTP $HTTP_STATUS)"
  log "Response: $HTTP_BODY"
  exit 1
fi

# JSON からジョブIDを抽出（簡易パーサ）
job_ids=$(printf '%s' "$HTTP_BODY" | grep -o '"id":"[^"]*"' | cut -d '"' -f4 | head -n "$MAX_TO_TRIGGER")

if [ -z "$job_ids" ]; then
  log "No pending jobs found."
  exit 0
fi

count=0
for job_id in $job_ids; do
  count=$((count + 1))
  log "Triggering execution for job $job_id ($count)"

  # 失敗しても残りのジョブは続けて実行する（409 は日次/月次ジョブ等が開始済み）
  trigger_import_job "$job_id" || true

  sleep "$SLEEP_BETWEEN_TRIGGERS"
done

log "Done. Triggered $count job(s)."
exit 0
