# geppoテーブル シードデータガイド

geppoテーブルは月報システムからの作業実績データを格納するテーブルです。
day01からday31までの各カラムが1ヶ月の各日の作業時間（時）を表しています。

## テーブル仕様

- `yyyyMM`: 対象年月（例: "2024/12"）
- `projectName`: プロジェクト名
- `taskName`: タスク名
- `wbsId`: WBS識別子
- `biko`: 備考
- `status`: ステータス
- `day01`〜`day31`: 各日の作業時間（時間）

**重要**: テーブルスキーマが変更された場合でも、セットアップスクリプトは既存テーブルを削除して最新の構造で再作成します。

## 利用可能なコマンド

### 一括セットアップ（推奨）
```bash
# MySQL環境構築 + geppoテーブル作成 + シードデータ投入
npm run mysql:setup
```

### 個別コマンド
```bash
# MySQLコンテナの起動
npm run mysql:start

# シードデータのみ投入
npm run mysql:seed

# コンテナログの確認
npm run mysql:logs

# MySQLコンテナの停止
npm run mysql:stop
```

## データ確認コマンド

```bash
# 全データの確認
docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "SELECT * FROM geppo;"

# プロジェクト別の作業時間集計
docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "
SELECT 
  projectName,
  SUM(day01 + day02 + day03 + day04 + day05 + day06 + day07 + day08 + day09 + day10 +
      day11 + day12 + day13 + day14 + day15 + day16 + day17 + day18 + day19 + day20 +
      day21 + day22 + day23 + day24 + day25 + day26 + day27 + day28 + day29 + day30 + day31) as totalHours
FROM geppo 
GROUP BY projectName;
"

# 特定プロジェクトの詳細
docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "
SELECT projectName, taskName, 
       (day01 + day02 + day03 + day04 + day05 + day06 + day07 + day08 + day09 + day10 +
        day11 + day12 + day13 + day14 + day15 + day16 + day17 + day18 + day19 + day20 +
        day21 + day22 + day23 + day24 + day25 + day26 + day27 + day28 + day29 + day30 + day31) as totalHours
FROM geppo 
WHERE projectName = 'Webアプリケーション開発';
"
```

## シードデータの内容

作成される5つのサンプルレコード：

1. **Webアプリケーション開発 - フロントエンド開発** (2024-12: 合計180時間)
   - React コンポーネント実装
   - 平日8時間、一部6-7時間の作業

2. **Webアプリケーション開発 - バックエンドAPI開発** (2024-12: 合計84時間)  
   - REST API実装とテスト
   - 平日4-6時間の作業

3. **データベース設計 - スキーマ設計** (2024-11: 合計4時間)
   - ER図作成とテーブル設計
   - 限定的な作業時間

4. **システムテスト - 結合テスト** (2025-01: 合計0時間)
   - 各モジュール間のテスト実施
   - 待機中ステータス

5. **ドキュメント作成 - 技術仕様書作成** (2024-12: 合計14時間)
   - システム仕様書の作成
   - 散発的な作業

## カスタムデータの追加

```sql
-- geppoテーブルに新しいデータを追加する例
INSERT INTO geppo (
  id, projectName, yyyyMM, taskName, wbsId, biko, status,
  day01, day02, day03, day04, day05, day06, day07, day08, day09, day10,
  day11, day12, day13, day14, day15, day16, day17, day18, day19, day20,
  day21, day22, day23, day24, day25, day26, day27, day28, day29, day30, day31
) VALUES (
  'custom-001',
  '新規プロジェクト',
  '2025-01',
  '新規タスク',
  'WBS-999',
  '備考欄',
  '進行中',
  8, 8, 8, 8, 8, 0, 0, 8, 8, 8,
  8, 8, 0, 0, 8, 8, 8, 8, 8, 0,
  0, 8, 8, 8, 8, 8, 0
);
```

## トラブルシューティング

### MySQLコンテナが起動しない
```bash
# コンテナ状態の確認
docker ps -a

# ログの確認
docker compose -f compose.mysql.yml logs db-test

# ボリュームの削除とリセット
docker compose -f compose.mysql.yml down -v
npm run mysql:start
```

### データが正しく挿入されない
```bash
# テーブル構造の確認
docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "DESCRIBE geppo;"

# データの完全削除と再投入
docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "DELETE FROM geppo;"
npm run mysql:seed
``` 