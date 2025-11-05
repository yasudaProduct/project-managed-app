#!/bin/bash

# 保留中（PENDING）のインポートジョブを列挙し、順次実行するcronスクリプト

set -e

# 環境変数
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
LOG_FILE="/var/log/cron/run-pending-import-jobs.log"
SLEEP_BETWEEN_TRIGGERS="${SLEEP_BETWEEN_TRIGGERS:-2}"
MAX_TO_TRIGGER="${MAX_TO_TRIGGER:-50}"

# ログ出力
mkdir -p "$(dirname "$LOG_FILE")"
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Checking for pending import jobs..."

# 保留中ジョブの取得
list_response=$(curl -s -w "\n%{http_code}" \
  "$API_BASE_URL/api/import-jobs?status=PENDING" || echo -e "\nERROR")

list_body=$(echo "$list_response" | head -n -1)
list_code=$(echo "$list_response" | tail -n 1)

if [ "$list_code" = "ERROR" ] || [ "$list_code" -ne 200 ]; then
  log "ERROR: Failed to fetch pending jobs (HTTP $list_code)"
  log "Response: $list_body"
  exit 1
fi

# JSON からジョブIDを抽出（簡易パーサ）
job_ids=$(echo "$list_body" | grep -o '"id":"[^"]*' | cut -d '"' -f4 | head -n "$MAX_TO_TRIGGER")

if [ -z "$job_ids" ]; then
  log "No pending jobs found."
  exit 0
fi

count=0
for job_id in $job_ids; do
  count=$((count + 1))
  log "Triggering execution for job $job_id ($count)"

  exec_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_BASE_URL/api/import-jobs/$job_id/execute" || echo "ERROR")

  if [ "$exec_code" = "ERROR" ] || [ "$exec_code" -lt 200 ] || [ "$exec_code" -ge 300 ]; then
    log "ERROR: Failed to trigger job $job_id (HTTP $exec_code)"
  else
    log "Triggered job $job_id successfully"
  fi

  sleep "$SLEEP_BETWEEN_TRIGGERS"
done

log "Done. Triggered $count job(s)."
exit 0


