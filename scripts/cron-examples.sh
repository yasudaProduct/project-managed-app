#!/bin/bash

# Cron設定例
# このファイルは直接実行するものではなく、crontabの設定例を示すものです
# 
# crontabに設定するには:
# crontab -e
# 
# 以下の行を追加:

# ========================================
# Geppoインポートの定期実行例
# ========================================

# 毎月1日の午前2時に前月のデータをインポート
# 0 2 1 * * /path/to/project/scripts/geppo-monthly-import.sh >> /var/log/geppo-import.log 2>&1

# 毎週月曜日の午前1時に当月のデータをインポート（週次更新）
# 0 1 * * 1 /path/to/project/scripts/geppo-weekly-import.sh >> /var/log/geppo-import.log 2>&1

# ========================================
# WBSインポートの定期実行例  
# ========================================

# 毎日午前3時にWBS同期
# 0 3 * * * /path/to/project/scripts/wbs-daily-sync.sh >> /var/log/wbs-sync.log 2>&1

# 平日の午前9時と午後6時にWBS同期
# 0 9,18 * * 1-5 /path/to/project/scripts/wbs-sync.sh >> /var/log/wbs-sync.log 2>&1

# ========================================
# 実際のスクリプト例
# ========================================

cat > geppo-monthly-import.sh << 'EOF'
#!/bin/bash

# 設定
BASE_URL="${APP_BASE_URL:-https://your-domain.com}"
LOG_FILE="/var/log/geppo-import.log"

# 前月を計算
TARGET_MONTH=$(date -d "last month" +%Y-%m)

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# メイン処理
main() {
    log "Starting Geppo import for month: $TARGET_MONTH"
    
    # API呼び出し
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"targetMonth\": \"$TARGET_MONTH\",
            \"updateMode\": \"replace\",
            \"skipValidation\": false
        }" \
        "$BASE_URL/api/import/geppo")
    
    # レスポンスチェック
    if echo "$response" | jq -e '.success' > /dev/null; then
        success_count=$(echo "$response" | jq -r '.data.successCount')
        error_count=$(echo "$response" | jq -r '.data.errorCount')
        
        log "Import completed successfully. Success: $success_count, Errors: $error_count"
        
        # エラーがある場合は詳細をログ出力
        if [ "$error_count" -gt 0 ]; then
            log "Error details:"
            echo "$response" | jq -r '.data.errors[] | "  - \(.recordId): \(.message)"' | tee -a "$LOG_FILE"
        fi
        
        # Slackなどに通知（オプション）
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"Geppo import completed for $TARGET_MONTH. Success: $success_count, Errors: $error_count\"}" \
                "$SLACK_WEBHOOK_URL"
        fi
        
        exit 0
    else
        error_msg=$(echo "$response" | jq -r '.error // "Unknown error"')
        log "Import failed: $error_msg"
        
        # 失敗通知
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"⚠️ Geppo import failed for $TARGET_MONTH: $error_msg\"}" \
                "$SLACK_WEBHOOK_URL"
        fi
        
        exit 1
    fi
}

# 実行
main "$@"
EOF

cat > wbs-daily-sync.sh << 'EOF'
#!/bin/bash

# 設定
BASE_URL="${APP_BASE_URL:-https://your-domain.com}"
LOG_FILE="/var/log/wbs-sync.log"

# 同期対象WBS ID一覧（環境に合わせて設定）
WBS_IDS="${WBS_SYNC_IDS:-1,2,3}"

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 単一WBSの同期
sync_wbs() {
    local wbs_id="$1"
    
    log "Starting WBS sync for ID: $wbs_id"
    
    # まずプレビューで確認
    preview_response=$(curl -s \
        "$BASE_URL/api/import/wbs?wbsId=$wbs_id")
    
    if ! echo "$preview_response" | jq -e '.success' > /dev/null; then
        log "Failed to get preview for WBS $wbs_id"
        return 1
    fi
    
    # バリデーションエラーをチェック
    validation_errors=$(echo "$preview_response" | jq -r '.data.preview.validationErrors[]?')
    if [ -n "$validation_errors" ]; then
        log "Validation errors found for WBS $wbs_id, skipping sync"
        echo "$validation_errors" | tee -a "$LOG_FILE"
        return 1
    fi
    
    # 同期実行
    sync_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"wbsId\": $wbs_id,
            \"syncMode\": \"replace\",
            \"skipValidation\": true
        }" \
        "$BASE_URL/api/import/wbs")
    
    if echo "$sync_response" | jq -e '.success' > /dev/null; then
        success_count=$(echo "$sync_response" | jq -r '.data.successCount')
        created_count=$(echo "$sync_response" | jq -r '.data.createdCount')
        updated_count=$(echo "$sync_response" | jq -r '.data.updatedCount')
        
        log "WBS $wbs_id sync completed. Total: $success_count, Created: $created_count, Updated: $updated_count"
        return 0
    else
        error_msg=$(echo "$sync_response" | jq -r '.error // "Unknown error"')
        log "WBS $wbs_id sync failed: $error_msg"
        return 1
    fi
}

# メイン処理
main() {
    log "Starting daily WBS sync"
    
    success_count=0
    failure_count=0
    
    # カンマ区切りのWBS IDsを処理
    IFS=',' read -ra WBS_ARRAY <<< "$WBS_IDS"
    for wbs_id in "${WBS_ARRAY[@]}"; do
        if sync_wbs "$wbs_id"; then
            success_count=$((success_count + 1))
        else
            failure_count=$((failure_count + 1))
        fi
        
        # 少し間隔をあける
        sleep 5
    done
    
    log "Daily WBS sync completed. Success: $success_count, Failures: $failure_count"
    
    # 通知
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        if [ $failure_count -eq 0 ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ Daily WBS sync completed successfully. Synced $success_count WBS instances.\"}" \
                "$SLACK_WEBHOOK_URL"
        else
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"⚠️ Daily WBS sync completed with $failure_count failures. Success: $success_count\"}" \
                "$SLACK_WEBHOOK_URL"
        fi
    fi
    
    exit $failure_count
}

# 実行
main "$@"
EOF

# スクリプトに実行権限を付与
chmod +x geppo-monthly-import.sh
chmod +x wbs-daily-sync.sh

echo "Created cron example scripts:"
echo "- geppo-monthly-import.sh"
echo "- wbs-daily-sync.sh"
echo ""
echo "To set up cron jobs, run 'crontab -e' and add the appropriate lines."
echo "Don't forget to set the required environment variables:"
echo "- APP_BASE_URL"
echo "- SLACK_WEBHOOK_URL (optional)"
echo "- WBS_SYNC_IDS (for WBS sync)"