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

-- 月報テーブル
CREATE TABLE `geppo` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `projectName` VARCHAR(191),
  `taskName` VARCHAR(191),
  `wbsId` VARCHAR(191),
  `biko` VARCHAR(191),
  `status` VARCHAR(191),
  `day01` INT NOT NULL,
  `day02` INT NOT NULL,
  `day03` INT NOT NULL,
  `day04` INT NOT NULL,
  `day05` INT NOT NULL,
  `day06` INT NOT NULL,
  `day07` INT NOT NULL,
  `day08` INT NOT NULL,
  `day09` INT NOT NULL,
  `day10` INT NOT NULL,
  `day11` INT NOT NULL,
  `day12` INT NOT NULL,
  `day13` INT NOT NULL,
  `day14` INT NOT NULL,
  `day15` INT NOT NULL,
  `day16` INT NOT NULL,
  `day17` INT NOT NULL,
  `day18` INT NOT NULL,
  `day19` INT NOT NULL,
  `day20` INT NOT NULL,
  `day21` INT NOT NULL,
  `day22` INT NOT NULL,
  `day23` INT NOT NULL,
  `day24` INT NOT NULL,
  `day25` INT NOT NULL,
  `day26` INT NOT NULL,
  `day27` INT NOT NULL,
  `day28` INT NOT NULL,
  `day29` INT NOT NULL,
  `day30` INT NOT NULL,
  `day31` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;