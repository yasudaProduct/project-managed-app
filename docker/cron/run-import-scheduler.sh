#!/bin/bash

# 定期インポートを起動するスクリプト（cron から毎分実行）
# 期限が来たWBSの定期インポートをジョブとして登録し、実行待ちのジョブを開始する。
# 各WBSの頻度・対象は画面（WBS画面の「設定」タブ / システム設定）で設定する。

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
LOG_FILE="/var/log/cron/import-scheduler.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    --connect-timeout 10 \
    --max-time 60 \
    "$API_BASE_URL/api/cron/import-schedules") || response=$'\n000'
body=$(printf '%s' "$response" | sed '$d')
http_code=$(printf '%s' "$response" | tail -n 1)

if [ "$http_code" != "200" ]; then
    log "ERROR: Failed to run import schedules (HTTP $http_code): $body"
    exit 1
fi

# 毎分のログが増えすぎないよう、ジョブを登録したときだけ記録する
if ! printf '%s' "$body" | grep -q '"createdJobIds":\[\]'; then
    log "Import jobs created: $body"
fi
