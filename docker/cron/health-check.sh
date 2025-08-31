# 基本的なヘルスチェック
if pgrep -x "crond" > /dev/null; then
    # Cronプロセスが実行中
    if [ -f /var/log/cron/notification-check.log ]; then
        # 最新のログをチェック（1時間以内に更新されているか）
        LAST_UPDATE=$(stat -c %Y /var/log/cron/notification-check.log 2>/dev/null || stat -f %m /var/log/cron/notification-check.log 2>/dev/null)
        CURRENT_TIME=$(date +%s)
        TIME_DIFF=$((CURRENT_TIME - LAST_UPDATE))
        
        if [ $TIME_DIFF -lt 3600 ]; then
            echo "Cron service is healthy"
            exit 0
        else
            echo "Cron service may be stuck (last update: ${TIME_DIFF}s ago)"
            exit 1
        fi
    else
        echo "Cron service is running but no log file found"
        exit 0
    fi
else
    echo "Cron service is not running"
    exit 1
fi