#!/bin/sh
# 環境変数をロード
set -a
if [ -f /app/.env ]; then
    . /app/.env
fi
set +a

# ログディレクトリを作成
mkdir -p /var/log/cron

# cron のジョブはコンテナの環境変数（compose の environment 等）を引き継がないため、
# 起動時の値を書き出し、crontab の BASH_ENV で bash スクリプトに読み込ませる（シェル固有の変数は除く）
export -p \
    | grep -Ev '^(declare -x|export) (HOME|HOSTNAME|OLDPWD|PATH|PWD|SHLVL|TERM|_)(=|$)' \
    > /etc/cron.env
chmod 600 /etc/cron.env

# Cronサービスを開始
echo "Starting cron service..."
echo "Current timezone: $(date)"
echo "Cron jobs loaded (system crontab):"
cat /etc/crontab || true

# Cronサービスをフォアグラウンドで実行（cronie）
crond -n
