-- MySQL初期化スクリプト
-- プロジェクト管理アプリケーション用データベース設定

-- データベースの文字セットとコレーションを設定
SET NAMES utf8mb4;

SET CHARACTER SET utf8mb4;

-- タイムゾーンの設定
SET time_zone = '+09:00';

-- 必要に応じて追加の初期化処理をここに記述
-- 例: 初期データの挿入、ユーザー権限の設定など

-- データベースが正常に作成されたことを確認
SELECT 'MySQL database initialized successfully' AS status;