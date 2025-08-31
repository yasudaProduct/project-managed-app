#!/bin/sh
# 環境変数をロード
set -a
if [ -f /app/.env ]; then
    source /app/.env
fi
set +a

# ログファイルの設定
LOG_FILE="/var/log/cron/notification-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting notification check..." >> $LOG_FILE

# デフォルトのAPI URL
API_URL="${NOTIFICATION_API_URL:-http://app:3000/api/cron/notifications}"

# HTTPリクエストを実行
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" \
    --connect-timeout 30 \
    --max-time 300 \
    "$API_URL")

# レスポンスを分割
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

# 結果をログに記録
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "207" ]; then
    echo "[$TIMESTAMP] Success (HTTP $HTTP_CODE): $BODY" >> $LOG_FILE
else
    echo "[$TIMESTAMP] Error (HTTP $HTTP_CODE): $BODY" >> $LOG_FILE
    # エラー時のアラート送信（オプション）
    if [ -f /usr/local/bin/send-alert.sh ]; then
        /usr/local/bin/send-alert.sh "Notification cron failed: HTTP $HTTP_CODE"
    fi
fi

# ログファイルのサイズ制限（10MB）
if [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    echo "[$TIMESTAMP] Log file rotated" > "$LOG_FILE"
fi