-- geppoテーブル作成SQL
-- 月報システムからの作業実績データを格納するテーブル

-- 既存のテーブルを削除（テーブル変更に対応）
DROP TABLE IF EXISTS geppo;

-- geppoテーブルの作成
CREATE TABLE `geppo` (
    `MEMBER_ID` varchar(15) NOT NULL DEFAULT '',
    `GEPPO_YYYYMM` varchar(6) NOT NULL DEFAULT '',
    `ROW_NO` int NOT NULL DEFAULT 0,
    `COMPANY_NAME` varchar(50) DEFAULT NULL,
    `MEMBER_NAME` varchar(20) DEFAULT NULL,
    `PROJECT_ID` varchar(50) DEFAULT NULL,
    `PROJECT_SUB_ID` varchar(20) DEFAULT NULL,
    `WBS_NO` varchar(20) DEFAULT NULL,
    `WBS_NAME` varchar(100) DEFAULT NULL,
    `WORK_NAME` varchar(100) DEFAULT NULL,
    `WORK_STATUS` varchar(20) DEFAULT NULL,
    `TOTAL` double DEFAULT NULL,
    `DAY01` double DEFAULT NULL,
    `DAY02` double DEFAULT NULL,
    `DAY03` double DEFAULT NULL,
    `DAY04` double DEFAULT NULL,
    `DAY05` double DEFAULT NULL,
    `DAY06` double DEFAULT NULL,
    `DAY07` double DEFAULT NULL,
    `DAY08` double DEFAULT NULL,
    `DAY09` double DEFAULT NULL,
    `DAY10` double DEFAULT NULL,
    `DAY11` double DEFAULT NULL,
    `DAY12` double DEFAULT NULL,
    `DAY13` double DEFAULT NULL,
    `DAY14` double DEFAULT NULL,
    `DAY15` double DEFAULT NULL,
    `DAY16` double DEFAULT NULL,
    `DAY17` double DEFAULT NULL,
    `DAY18` double DEFAULT NULL,
    `DAY19` double DEFAULT NULL,
    `DAY20` double DEFAULT NULL,
    `DAY21` double DEFAULT NULL,
    `DAY22` double DEFAULT NULL,
    `DAY23` double DEFAULT NULL,
    `DAY24` double DEFAULT NULL,
    `DAY25` double DEFAULT NULL,
    `DAY26` double DEFAULT NULL,
    `DAY27` double DEFAULT NULL,
    `DAY28` double DEFAULT NULL,
    `DAY29` double DEFAULT NULL,
    `DAY30` double DEFAULT NULL,
    `DAY31` double DEFAULT NULL,
    `FILE_NAME` varchar(100) DEFAULT NULL,
    `FILE_UPDATE_DATE` datetime(0) DEFAULT NULL,
    `UPDATE_DATE` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (
        `MEMBER_ID`,
        `GEPPO_YYYYMM`,
        `ROW_NO`
    ),
    KEY `INDEX1` (
        `MEMBER_ID`,
        `GEPPO_YYYYMM`,
        `ROW_NO`,
        `PROJECT_ID`
    )
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- テーブル作成完了の確認
SELECT 'geppoテーブルが正常に作成されました' AS result;