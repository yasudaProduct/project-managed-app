-- geppoテーブル作成SQL
-- 月報システムからの作業実績データを格納するテーブル

-- 既存のテーブルを削除（テーブル変更に対応）
DROP TABLE IF EXISTS geppo;

-- geppoテーブルの作成
CREATE TABLE geppo (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255),
    projectName VARCHAR(255),
    yyyyMM VARCHAR(255),
    taskName VARCHAR(255),
    wbsId VARCHAR(255),
    biko TEXT,
    status VARCHAR(255),
    day01 INT DEFAULT 0,
    day02 INT DEFAULT 0,
    day03 INT DEFAULT 0,
    day04 INT DEFAULT 0,
    day05 INT DEFAULT 0,
    day06 INT DEFAULT 0,
    day07 INT DEFAULT 0,
    day08 INT DEFAULT 0,
    day09 INT DEFAULT 0,
    day10 INT DEFAULT 0,
    day11 INT DEFAULT 0,
    day12 INT DEFAULT 0,
    day13 INT DEFAULT 0,
    day14 INT DEFAULT 0,
    day15 INT DEFAULT 0,
    day16 INT DEFAULT 0,
    day17 INT DEFAULT 0,
    day18 INT DEFAULT 0,
    day19 INT DEFAULT 0,
    day20 INT DEFAULT 0,
    day21 INT DEFAULT 0,
    day22 INT DEFAULT 0,
    day23 INT DEFAULT 0,
    day24 INT DEFAULT 0,
    day25 INT DEFAULT 0,
    day26 INT DEFAULT 0,
    day27 INT DEFAULT 0,
    day28 INT DEFAULT 0,
    day29 INT DEFAULT 0,
    day30 INT DEFAULT 0,
    day31 INT DEFAULT 0,
    INDEX idx_yyyyMM (yyyyMM),
    INDEX idx_projectName (projectName),
    INDEX idx_wbsId (wbsId)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- テーブル作成完了の確認
SELECT 'geppoテーブルが正常に作成されました' AS result;