#!/bin/bash

# WBSインポートジョブを実行するスクリプト
# 対象WBSは WBS_SYNC_IDS（カンマ区切りのWBS ID）で指定し、1件ずつ作成 → 実行 → 完了待ちを行う

set -e

LOG_FILE="/var/log/cron/wbs-import.log"
. "$(dirname "${BASH_SOURCE[0]}")/import-job-common.sh"

WBS_SYNC_IDS="${WBS_SYNC_IDS:-}"
WBS_SYNC_MODE="${WBS_SYNC_MODE:-diff}"

if [ -z "$WBS_SYNC_IDS" ]; then
    log "WBS_SYNC_IDS is not set. Skipping WBS import"
    exit 0
fi

if [ "$WBS_SYNC_MODE" != "diff" ] && [ "$WBS_SYNC_MODE" != "replace" ]; then
    log "ERROR: WBS_SYNC_MODE must be 'diff' or 'replace' (got: $WBS_SYNC_MODE)"
    exit 1
fi

log "Starting WBS import jobs (WBS IDs: $WBS_SYNC_IDS, sync mode: $WBS_SYNC_MODE)"

failure_count=0
IFS=',' read -ra wbs_ids <<< "$WBS_SYNC_IDS"
for raw_wbs_id in "${wbs_ids[@]}"; do
    wbs_id="$(echo "$raw_wbs_id" | tr -d '[:space:]')"
    [ -z "$wbs_id" ] && continue

    if ! [[ "$wbs_id" =~ ^[1-9][0-9]*$ ]]; then
        log "ERROR: Invalid WBS ID: $wbs_id"
        failure_count=$((failure_count + 1))
        continue
    fi

    if ! run_import_job "WBS $wbs_id" \
        "{\"type\":\"WBS\",\"wbsId\":$wbs_id,\"options\":{\"syncMode\":\"$WBS_SYNC_MODE\"}}"; then
        failure_count=$((failure_count + 1))
    fi
done

if [ "$failure_count" -gt 0 ]; then
    log "WBS import finished with $failure_count failure(s)"
    exit 1
fi

log "WBS import finished successfully"
