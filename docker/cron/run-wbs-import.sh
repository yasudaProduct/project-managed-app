#!/bin/bash

# WBSインポートジョブを実行するスクリプト

set -e

# 環境変数の設定
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
SYSTEM_USER_ID="${SYSTEM_USER_ID:-system}"
LOG_FILE="/var/log/cron/wbs-import.log"

# ログディレクトリの作成
mkdir -p "$(dirname "$LOG_FILE")"

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting WBS import job"

# WBSインポートジョブの作成
create_response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"WBS_IMPORT\",
        \"createdBy\": \"$SYSTEM_USER_ID\"
    }" \
    "$API_BASE_URL/api/import-jobs" || echo -e "\nERROR")

# レスポンスの分離
response_body=$(echo "$create_response" | head -n -1)
http_code=$(echo "$create_response" | tail -n 1)

if [ "$http_code" = "ERROR" ]; then
    log "ERROR: Failed to connect to API"
    exit 1
fi

if [ "$http_code" -ne 201 ]; then
    log "ERROR: Failed to create WBS import job (HTTP $http_code)"
    log "Response: $response_body"
    exit 1
fi

# ジョブIDの取得
job_id=$(echo "$response_body" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$job_id" ]; then
    log "ERROR: Could not extract job ID from response"
    log "Response: $response_body"
    exit 1
fi

log "WBS import job created successfully (ID: $job_id)"

# ジョブの完了を待機（最大30分）
max_wait=1800  # 30 minutes
wait_time=0
sleep_interval=30

while [ $wait_time -lt $max_wait ]; do
    # ジョブステータスの確認
    status_response=$(curl -s -w "\n%{http_code}" \
        "$API_BASE_URL/api/import-jobs?userId=$SYSTEM_USER_ID" || echo -e "\nERROR")
    
    status_body=$(echo "$status_response" | head -n -1)
    status_code=$(echo "$status_response" | tail -n 1)
    
    if [ "$status_code" = "ERROR" ] || [ "$status_code" -ne 200 ]; then
        log "WARNING: Could not check job status (HTTP $status_code)"
    else
        # 該当ジョブのステータスを抽出
        job_status=$(echo "$status_body" | grep -A 10 -B 10 "$job_id" | grep -o '"status":"[^"]*' | cut -d'"' -f4 | head -1)
        
        if [ "$job_status" = "COMPLETED" ]; then
            log "WBS import job completed successfully"
            exit 0
        elif [ "$job_status" = "FAILED" ]; then
            log "ERROR: WBS import job failed"
            exit 1
        else
            log "WBS import job in progress (status: $job_status)"
        fi
    fi
    
    sleep $sleep_interval
    wait_time=$((wait_time + sleep_interval))
done

log "WARNING: WBS import job did not complete within timeout period"
exit 2