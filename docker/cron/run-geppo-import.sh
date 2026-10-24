#!/bin/bash

# Geppoインポートジョブを実行するスクリプト
# 対象月は TARGET_MONTH（YYYY-MM）で指定でき、未指定の場合は前月

set -e

LOG_FILE="/var/log/cron/geppo-import.log"
. "$(dirname "${BASH_SOURCE[0]}")/import-job-common.sh"

# 前月（YYYY-MM）を求める。BusyBox の date は "last month" のような相対指定に対応していないため算術で計算する
previous_month() {
    local year month
    read -r year month <<< "$(date '+%Y %m')"
    month=$((10#$month - 1))
    if [ "$month" -eq 0 ]; then
        month=12
        year=$((year - 1))
    fi
    printf '%04d-%02d\n' "$year" "$month"
}

TARGET_MONTH="${TARGET_MONTH:-$(previous_month)}"

log "Starting Geppo import job for $TARGET_MONTH"

result=0
run_import_job "Geppo $TARGET_MONTH" "{\"type\":\"GEPPO\",\"targetMonth\":\"$TARGET_MONTH\"}" || result=$?
exit "$result"
