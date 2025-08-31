#!/bin/sh
# 環境変数をロード
set -a
if [ -f /app/.env ]; then
    source /app/.env
fi
set +a

# ログディレクトリを作成
mkdir -p /var/log/cron

# Cronサービスを開始
echo "Starting cron service..."
echo "Current timezone: $(date)"
echo "Cron jobs loaded:"
crontab -l

# Cronサービスをフォアグラウンドで実行
crond -f -d 8