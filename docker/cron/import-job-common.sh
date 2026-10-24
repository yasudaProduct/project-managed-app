#!/bin/bash

# インポートジョブ用 cron スクリプトの共通処理（run-*-import*.sh から source する）
# 呼び出し側で LOG_FILE を設定してから読み込むこと
# cron から起動された場合の環境変数は crontab の BASH_ENV（/etc/cron.env）で読み込まれる

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
JOB_POLL_INTERVAL_SEC="${JOB_POLL_INTERVAL_SEC:-30}"
JOB_TIMEOUT_SEC="${JOB_TIMEOUT_SEC:-1800}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# curl でリクエストし、HTTP_STATUS と HTTP_BODY を設定する（接続できない場合 HTTP_STATUS=000）
http_request() {
    local method="$1" url="$2" data="${3:-}"
    local args=(-s -X "$method" -w '\n%{http_code}' --connect-timeout 10 --max-time 60)
    local response

    if [ -n "$data" ]; then
        args+=(-H "Content-Type: application/json" -d "$data")
    fi

    response="$(curl "${args[@]}" "$url")" || response=$'\n000'
    HTTP_BODY="$(printf '%s' "$response" | sed '$d')"
    HTTP_STATUS="$(printf '%s' "$response" | tail -n 1)"
}

# JSON 内で最初に現れる文字列フィールドの値を取り出す（jq を使わない簡易パーサ）
json_string_field() {
    grep -o "\"$1\":\"[^\"]*\"" | head -n 1 | cut -d '"' -f4
}

# ジョブを作成し、IMPORT_JOB_ID を設定する
create_import_job() {
    local payload="$1"
    IMPORT_JOB_ID=""

    http_request POST "$API_BASE_URL/api/import-jobs" "$payload"
    if [ "$HTTP_STATUS" != "201" ]; then
        log "ERROR: Failed to create import job (HTTP $HTTP_STATUS): $HTTP_BODY"
        return 1
    fi

    IMPORT_JOB_ID="$(printf '%s' "$HTTP_BODY" | json_string_field id)"
    if [ -z "$IMPORT_JOB_ID" ]; then
        log "ERROR: Could not extract job ID from response: $HTTP_BODY"
        return 1
    fi
}

# ジョブの実行を開始する。409 は他の実行者（毎分の run-pending-import-jobs.sh 等）が開始済みのため成功扱い
trigger_import_job() {
    local job_id="$1"

    http_request POST "$API_BASE_URL/api/import-jobs/$job_id/execute"
    case "$HTTP_STATUS" in
        2??)
            log "Triggered execution for job $job_id"
            ;;
        409)
            log "Job $job_id has already been started by another runner"
            ;;
        *)
            log "WARNING: Failed to trigger execution for job $job_id (HTTP $HTTP_STATUS): $HTTP_BODY"
            return 1
            ;;
    esac
}

# ジョブが終了するまで待つ（COMPLETED: 0 / FAILED・CANCELLED: 1 / タイムアウト: 2）
wait_for_import_job() {
    local job_id="$1" waited=0 status

    while [ "$waited" -lt "$JOB_TIMEOUT_SEC" ]; do
        http_request GET "$API_BASE_URL/api/import-jobs/$job_id"
        if [ "$HTTP_STATUS" = "200" ]; then
            status="$(printf '%s' "$HTTP_BODY" | json_string_field status)"
            case "$status" in
                COMPLETED)
                    return 0
                    ;;
                FAILED|CANCELLED)
                    log "Job $job_id finished with status $status: ${HTTP_BODY:0:2000}"
                    return 1
                    ;;
                *)
                    log "Job $job_id in progress (status: $status)"
                    ;;
            esac
        else
            log "WARNING: Could not check status of job $job_id (HTTP $HTTP_STATUS)"
        fi

        sleep "$JOB_POLL_INTERVAL_SEC"
        waited=$((waited + JOB_POLL_INTERVAL_SEC))
    done

    return 2
}

# ジョブを作成 → 実行 → 終了まで待つ（戻り値は wait_for_import_job と同じ。作成失敗は 1）
run_import_job() {
    local label="$1" payload="$2" result=0

    create_import_job "$payload" || return 1
    log "$label import job created (ID: $IMPORT_JOB_ID)"

    # 開始に失敗しても PENDING のままなら毎分の run-pending-import-jobs.sh が開始するため、待機は続ける
    trigger_import_job "$IMPORT_JOB_ID" || true

    wait_for_import_job "$IMPORT_JOB_ID" || result=$?
    case "$result" in
        0) log "$label import job completed successfully (ID: $IMPORT_JOB_ID)" ;;
        1) log "ERROR: $label import job failed (ID: $IMPORT_JOB_ID)" ;;
        *) log "WARNING: $label import job did not complete within ${JOB_TIMEOUT_SEC}s (ID: $IMPORT_JOB_ID)" ;;
    esac
    return "$result"
}
