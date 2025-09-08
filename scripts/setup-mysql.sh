#!/bin/bash

# 開発用MySQL環境セットアップスクリプト
# geppo・wbsテーブルの作成とシードデータの投入

set -e

echo "🚀 MySQL環境のセットアップを開始します..."

# 環境変数の設定
export DATABASE_URL="mysql://app_user:app_password@localhost:3306/project_managed?charset=utf8mb4"
export GEPPO_DATABASE_URL="mysql://test_user:test_password@localhost:3307/project_managed_test?charset=utf8mb4"

# 1. MySQLコンテナの起動確認
echo "📦 MySQLコンテナの状態を確認しています..."
if ! docker ps | grep -q project-managed-mysql-test; then
    echo "🔄 MySQLコンテナを起動しています..."
    docker compose -f compose.mysql.yml up -d db-test
    
    # MySQLの起動を待機
    echo "⏳ MySQLの起動を待機しています..."
    sleep 10
    
    # 接続確認
    max_attempts=30
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec project-managed-mysql-test mysql -u test_user -ptest_password -e "SELECT 1;" project_managed_test > /dev/null 2>&1; then
            echo "✅ MySQLに接続できました"
            break
        fi
        echo "🔄 MySQL接続試行 $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ MySQLへの接続に失敗しました"
        exit 1
    fi
else
    echo "✅ MySQLコンテナは既に起動しています"
fi

# 2. geppoテーブルの作成（既存テーブルがあれば削除して再作成）
# echo "🏗️  geppoテーブルを作成しています..."
# echo "   ↳ 既存テーブルがある場合は削除して再作成します"

# 外部SQLファイルを実行
# if [ -f "mysql/init/create-geppo-table.sql" ]; then
#     docker exec -i project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test < mysql/init/create-geppo-table.sql
#     echo "✅ geppoテーブルが作成されました（外部SQLファイルから）"
# else
#     echo "❌ SQLファイルが見つかりません: mysql/init/create-geppo-table.sql"
#     exit 1
# fi

# 3. wbsテーブルの作成（既存テーブルがあれば削除して再作成）
# echo "🏗️  wbsテーブルを作成しています..."
# echo "   ↳ 既存テーブルがある場合は削除して再作成します"

# 外部SQLファイルを実行
# if [ -f "mysql/init/create-wbs-table.sql" ]; then
#     docker exec -i project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test < mysql/init/create-wbs-table.sql
#     echo "✅ wbsテーブルが作成されました（外部SQLファイルから）"
# else
#     echo "❌ SQLファイルが見つかりません: mysql/init/create-wbs-table.sql"
#     exit 1
# fi

# 4. シードデータの投入
echo "🌱 シードデータを投入しています..."
npx tsx scripts/seed-mysql.ts

echo ""
echo "🎉 MySQL環境のセットアップが完了しました!"
echo ""
echo "📋 次のコマンドでデータを確認できます:"
echo "   mysql -h localhost -P 3307 -u test_user -ptest_password project_managed_test"
echo "   > SELECT * FROM geppo;"
echo ""
echo "🐳 MySQLコンテナを停止する場合:"
echo "   docker compose -f compose.mysql.yml down" 