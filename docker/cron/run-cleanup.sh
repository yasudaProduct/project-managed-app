#!/bin/sh
# 環境変数をロード
set -a
if [ -f /app/.env ]; then
    source /app/.env
fi
set +a

# ログファイルの設定
LOG_FILE="/var/log/cron/cleanup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting cleanup process..." >> $LOG_FILE

# 古いログファイルの削除（7日以上）
find /var/log/cron -name "*.log" -mtime +7 -delete 2>/dev/null

# 古いログファイルの削除（30日以上）
find /var/log/cron -name "*.log.old" -mtime +30 -delete 2>/dev/null

# 一時ファイルの削除
find /tmp -name "cron-*" -mtime +1 -delete 2>/dev/null

echo "[$TIMESTAMP] Cleanup completed" >> $LOG_FILE