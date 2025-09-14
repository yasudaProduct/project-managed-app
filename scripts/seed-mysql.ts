import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// コンテナ/DB接続の共通設定
const CONTAINER = 'project-managed-mysql-test'
const MYSQL_USER = 'test_user'
const MYSQL_PASS = 'test_password'
const MYSQL_DB = 'project_managed_test'

async function ensureTableExists(tableName: string, createSqlAbsolutePath: string) {
    try {
        await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SELECT 1 FROM ${tableName} LIMIT 1;"`)
        console.log(`✅ テーブル存在確認: ${tableName}`)
    } catch {
        console.log(`🏗️  テーブルが存在しません。作成します: ${tableName}`)
        await execAsync(`docker exec -i ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} < ${createSqlAbsolutePath}`)
        console.log(`✅ テーブルを作成しました: ${tableName}`)
    }
}

const baseDate = new Date()
const addDays = (days: number): Date => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date;
};

let geppoRowNo = 1

// seed.tsで生成しているデータと合わせる
const PROJECT_ID = "新規機能開発A"

// 処理に関係しない項目はダミー値
const dummyCOMPANY_NAME = "株式会社テスト"
const dummyMEMBER_NAME = "テスト太郎"
const dummyPROJECT_SUB_ID = "SUB-001"
const dummyWBS_NAME = "新規機能開発"

const geppoData = [
    {
        MEMBER_ID: "dummy01",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D2-0001",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "React コンポーネント実装",
        WORK_STATUS: "着手中",
        day01: 8, day02: 7, day03: 8, day04: 6, day05: 8,
        day06: 0, day07: 0, day08: 8, day09: 7, day10: 8,
        day11: 8, day12: 6, day13: 0, day14: 0, day15: 8,
        day16: 7, day17: 8, day18: 8, day19: 7, day20: 0,
        day21: 0, day22: 8, day23: 7, day24: 8, day25: 8,
        day26: 6, day27: 0, day28: 0, day29: 8, day30: 7,
        day31: 0
    },
    {
        MEMBER_ID: "dummy02",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D2-0002",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "REST API実装とテスト",
        WORK_STATUS: "進行中",
        day01: 4, day02: 5, day03: 4, day04: 6, day05: 4,
        day06: 0, day07: 0, day08: 4, day09: 5, day10: 4,
        day11: 4, day12: 6, day13: 0, day14: 0, day15: 4,
        day16: 5, day17: 4, day18: 4, day19: 5, day20: 0,
        day21: 0, day22: 4, day23: 5, day24: 4, day25: 4,
        day26: 6, day27: 0, day28: 0, day29: 4, day30: 5,
        day31: 0
    },
    {
        MEMBER_ID: "dummy02",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D2-0003",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "スキーマ設計",
        WORK_STATUS: "完了",
        day01: 0, day02: 0, day03: 0, day04: 2, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 0, day10: 0,
        day11: 0, day12: 2, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        MEMBER_ID: "dummy03",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D2-0004",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "各モジュール間のテスト実施",
        WORK_STATUS: "待機中",
        day01: 0, day02: 0, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 0, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        MEMBER_ID: "dummy03",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D2-0004",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "システム仕様書の作成",
        WORK_STATUS: "進行中",
        day01: 0, day02: 2, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 2, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 2, day17: 0, day18: 0, day19: 2, day20: 0,
        day21: 0, day22: 0, day23: 2, day24: 0, day25: 0,
        day26: 2, day27: 0, day28: 0, day29: 0, day30: 2,
        day31: 0
    },
    {
        MEMBER_ID: "dummy03",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D0-0001",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "見積もり作成",
        WORK_STATUS: "進行中",
        day01: 0, day02: 2, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 2, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    }
]

// MySQL wbsテーブル用のサンプルデータ
let wbsRowNo = 0
const wbsData = [
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: '新規機能開発',
        PROJECT_NAME: '新規機能開発',
        WBS_ID: 'D3-0001',
        PHASE: '開発',
        ACTIVITY: 'フロントエンド',
        TASK: 'React コンポーネント実装',
        KINO_SBT: '機能',
        SUBSYSTEM: 'UI',
        TANTO: 'dummy01',
        TANTO_REV: null,
        KIJUN_START_DATE: '2025-07-01',
        KIJUN_END_DATE: '2025-07-10',
        KIJUN_KOSU: 80,
        KIJUN_KOSU_BUFFER: 8,
        YOTEI_START_DATE: '2025-07-01',
        YOTEI_END_DATE: '2025-07-10',
        YOTEI_KOSU: 80,
        JISSEKI_START_DATE: '2025-07-01',
        JISSEKI_END_DATE: '2025-07-09',
        JISSEKI_KOSU: 76,
        STATUS: '進行中',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: '2025-07-05',
        EV_DATE: '2025-07-06',
        AC_DATE: '2025-07-06',
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: 50,
        EV_KOSU: 48,
        AC_KOSU: 52,
        BIKO: 'seed: 新規機能開発 D2-0001',
        PROGRESS_RATE: 60,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: '新規機能開発',
        PROJECT_NAME: '新規機能開発',
        WBS_ID: 'D3-0002',
        PHASE: '開発',
        ACTIVITY: 'バックエンド',
        TASK: 'REST API実装とテスト',
        KINO_SBT: '機能',
        SUBSYSTEM: 'API',
        TANTO: 'dummy02',
        TANTO_REV: null,
        KIJUN_START_DATE: '2025-07-03',
        KIJUN_END_DATE: '2025-07-18',
        KIJUN_KOSU: 120,
        KIJUN_KOSU_BUFFER: 12,
        YOTEI_START_DATE: '2025-07-03',
        YOTEI_END_DATE: '2025-07-18',
        YOTEI_KOSU: 120,
        JISSEKI_START_DATE: '2025-07-03',
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 80,
        STATUS: '進行中',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: '2025-07-10',
        EV_DATE: '2025-07-12',
        AC_DATE: '2025-07-12',
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: 70,
        EV_KOSU: 65,
        AC_KOSU: 75,
        BIKO: 'seed: 新規機能開発 D2-0002',
        PROGRESS_RATE: 55,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: '新規機能開発',
        PROJECT_NAME: '新規機能開発',
        WBS_ID: 'D2-0001',
        PHASE: '設計',
        ACTIVITY: 'DB',
        TASK: 'スキーマ設計',
        KINO_SBT: '設計',
        SUBSYSTEM: 'RDB',
        TANTO: 'dummy02',
        TANTO_REV: null,
        KIJUN_START_DATE: '2025-07-01',
        KIJUN_END_DATE: '2025-07-05',
        KIJUN_KOSU: 16,
        KIJUN_KOSU_BUFFER: 2,
        YOTEI_START_DATE: '2025-07-01',
        YOTEI_END_DATE: '2025-07-05',
        YOTEI_KOSU: 16,
        JISSEKI_START_DATE: '2025-07-04',
        JISSEKI_END_DATE: '2025-07-05',
        JISSEKI_KOSU: 16,
        STATUS: '完了',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: '2025-07-03',
        EV_DATE: '2025-07-05',
        AC_DATE: '2025-07-05',
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: 16,
        EV_KOSU: 16,
        AC_KOSU: 16,
        BIKO: 'seed: 新規機能開発 D2-0003',
        PROGRESS_RATE: 100,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: '新規機能開発',
        PROJECT_NAME: '新規機能開発',
        WBS_ID: 'D2-0004',
        PHASE: '開発',
        ACTIVITY: 'DB',
        TASK: 'React コンポーネント実装',
        KINO_SBT: '機能',
        SUBSYSTEM: 'UI',
        TANTO: 'dummy01',
        TANTO_REV: null,
        KIJUN_START_DATE: '2025-07-03',
        KIJUN_END_DATE: '2025-07-18',
        KIJUN_KOSU: 120,
        KIJUN_KOSU_BUFFER: 2,
        YOTEI_START_DATE: '2025-07-03',
        YOTEI_END_DATE: '2025-07-18',
        YOTEI_KOSU: 120,
        JISSEKI_START_DATE: '2025-07-04',
        JISSEKI_END_DATE: '2025-07-05',
        JISSEKI_KOSU: 80,
        STATUS: '完了',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: '2025-07-10',
        EV_DATE: '2025-07-12',
        AC_DATE: '2025-07-12',
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: 16,
        EV_KOSU: 16,
        AC_KOSU: 16,
        BIKO: 'seed: 新規機能開発 D2-0003',
        PROGRESS_RATE: 100,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: '見積もり作成',
        PROJECT_NAME: '見積もり作成',
        WBS_ID: 'D0-0001',
        PHASE: '見積',
        ACTIVITY: 'ドキュメント',
        TASK: '見積もり作成',
        KINO_SBT: '管理',
        SUBSYSTEM: 'PMO',
        TANTO: 'dummy03',
        TANTO_REV: null,
        KIJUN_START_DATE: '2025-07-01',
        KIJUN_END_DATE: '2025-07-02',
        KIJUN_KOSU: 8,
        KIJUN_KOSU_BUFFER: 1,
        YOTEI_START_DATE: '2025-07-01',
        YOTEI_END_DATE: '2025-07-02',
        YOTEI_KOSU: 8,
        JISSEKI_START_DATE: '2025-07-01',
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 2,
        STATUS: '進行前',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: null,
        EV_DATE: null,
        AC_DATE: null,
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: null,
        EV_KOSU: null,
        AC_KOSU: null,
        BIKO: 'seed: 見積もり作成 D0-0001',
        PROGRESS_RATE: 0,
    },
    // インポート検証用
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: 'インポート検証エラーあり',
        PROJECT_NAME: 'インポート検証エラーあり',
        WBS_ID: 'D1-0001',
        PHASE: '設計',
        ACTIVITY: '新規タスク',
        TASK: '担当者なし',
        KINO_SBT: '',
        SUBSYSTEM: '',
        TANTO: 'dummy02',
        TANTO_REV: null,
        KIJUN_START_DATE: formatWbsDate(baseDate),
        KIJUN_END_DATE: formatWbsDate(addDays(3)),
        KIJUN_KOSU: 8,
        KIJUN_KOSU_BUFFER: 1,
        YOTEI_START_DATE: formatWbsDate(baseDate),
        YOTEI_END_DATE: formatWbsDate(addDays(3)),
        YOTEI_KOSU: 8,
        JISSEKI_START_DATE: null,
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 2,
        STATUS: '着手中',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: null,
        EV_DATE: null,
        AC_DATE: null,
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: null,
        EV_KOSU: null,
        AC_KOSU: null,
        BIKO: 'seed: 見積もり作成 D0-0001',
        PROGRESS_RATE: 0,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: 'インポート検証エラーあり',
        PROJECT_NAME: 'インポート検証エラーあり',
        WBS_ID: 'D1-0002',
        PHASE: '要件定義',
        ACTIVITY: '新規タスク',
        TASK: 'フェーズなし',
        KINO_SBT: '',
        SUBSYSTEM: '',
        TANTO: 'dummy02',
        TANTO_REV: null,
        KIJUN_START_DATE: formatWbsDate(baseDate),
        KIJUN_END_DATE: formatWbsDate(addDays(3)),
        KIJUN_KOSU: 8,
        KIJUN_KOSU_BUFFER: 1,
        YOTEI_START_DATE: formatWbsDate(baseDate),
        YOTEI_END_DATE: formatWbsDate(addDays(3)),
        YOTEI_KOSU: 8,
        JISSEKI_START_DATE: null,
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 2,
        STATUS: '着手中',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: null,
        EV_DATE: null,
        AC_DATE: null,
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: null,
        EV_KOSU: null,
        AC_KOSU: null,
        BIKO: 'seed: 見積もり作成 D0-0001',
        PROGRESS_RATE: 0,
    },
    {
        FILE_NAME: 'seed.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: 'インポート検証',
        PROJECT_NAME: 'インポート検証',
        WBS_ID: 'D1-0001',
        PHASE: '設計',
        ACTIVITY: '新規タスク',
        TASK: 'インポート検証',
        KINO_SBT: '',
        SUBSYSTEM: '',
        TANTO: '安田',
        TANTO_REV: null,
        KIJUN_START_DATE: formatWbsDate(baseDate),
        KIJUN_END_DATE: formatWbsDate(addDays(3)),
        KIJUN_KOSU: 8,
        KIJUN_KOSU_BUFFER: 1,
        YOTEI_START_DATE: formatWbsDate(baseDate),
        YOTEI_END_DATE: formatWbsDate(addDays(3)),
        YOTEI_KOSU: 8,
        JISSEKI_START_DATE: null,
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 2,
        STATUS: '着手中',
        IPV_DATE: null,
        IBPV_DATE: null,
        PV_DATE: null,
        EV_DATE: null,
        AC_DATE: null,
        IPV_KOSU: null,
        IBPV_KOSU: null,
        PV_KOSU: null,
        EV_KOSU: null,
        AC_KOSU: null,
        BIKO: 'seed: 見積もり作成 D0-0001',
        PROGRESS_RATE: 0,
    },
]

const sampleWbsData = [...wbsData]

async function insertSeedData() {
    console.log('🌱 MySQL geppoテーブルのシードデータを開始します...')

    try {
        // 文字セットを設定
        console.log('🔧 文字セットを設定しています...')
        await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SET NAMES utf8mb4;"`)

        // 既存データをクリア
        // テーブル存在チェック（必要時に作成）
        await ensureTableExists('geppo', '/Users/yuta/Develop/project-managed-app/mysql/init/create-geppo-table.sql')

        console.log('🗑️  既存のgeppoデータをクリアしています...')
        await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "DELETE FROM geppo;"`)
        console.log('✅ 既存のgeppoデータをクリアしました')

        // サンプルデータを挿入
        for (const data of geppoData) {

            const insertSQL = `
        INSERT INTO geppo (
          MEMBER_ID, GEPPO_YYYYMM, ROW_NO, COMPANY_NAME, MEMBER_NAME, PROJECT_ID, PROJECT_SUB_ID, WBS_NO, WBS_NAME, WORK_NAME, WORK_STATUS,
          day01, day02, day03, day04, day05, day06, day07, day08, day09, day10,
          day11, day12, day13, day14, day15, day16, day17, day18, day19, day20,
          day21, day22, day23, day24, day25, day26, day27, day28, day29, day30, day31
        ) VALUES (
          ${data.MEMBER_ID ? `'${data.MEMBER_ID}'` : 'NULL'},
          ${data.GEPPO_YYYYMM ? `'${data.GEPPO_YYYYMM}'` : 'NULL'},
          ${data.ROW_NO ? `'${data.ROW_NO}'` : 'NULL'},
          ${data.COMPANY_NAME ? `'${data.COMPANY_NAME}'` : 'NULL'},
          ${data.MEMBER_NAME ? `'${data.MEMBER_NAME}'` : 'NULL'},
          ${data.PROJECT_ID ? `'${data.PROJECT_ID}'` : 'NULL'},
          ${data.PROJECT_SUB_ID ? `'${data.PROJECT_SUB_ID}'` : 'NULL'},
          ${data.WBS_NO ? `'${data.WBS_NO}'` : 'NULL'},
          ${data.WBS_NAME ? `'${data.WBS_NAME}'` : 'NULL'},
          ${data.WORK_NAME ? `'${data.WORK_NAME}'` : 'NULL'},
          ${data.WORK_STATUS ? `'${data.WORK_STATUS}'` : 'NULL'},
          ${data.day01}, ${data.day02}, ${data.day03}, ${data.day04}, ${data.day05},
          ${data.day06}, ${data.day07}, ${data.day08}, ${data.day09}, ${data.day10},
          ${data.day11}, ${data.day12}, ${data.day13}, ${data.day14}, ${data.day15},
          ${data.day16}, ${data.day17}, ${data.day18}, ${data.day19}, ${data.day20},
          ${data.day21}, ${data.day22}, ${data.day23}, ${data.day24}, ${data.day25},
          ${data.day26}, ${data.day27}, ${data.day28}, ${data.day29}, ${data.day30}, ${data.day31}
        );
      `

            await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "${insertSQL}"`)
            console.log(`✅ geppoデータを作成しました: ${data.PROJECT_ID} - ${data.WORK_NAME}`)
        }

        // 作成されたデータの統計を表示
        const { stdout: countResult } = await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SELECT COUNT(*) as count FROM geppo;" --skip-column-names`)
        const totalRecords = parseInt(countResult.trim())
        console.log(`\n📊 合計 ${totalRecords} 件のgeppoレコードが作成されました`)

        // プロジェクト別作業時間集計を表示
        console.log('\n📈 プロジェクト別作業時間集計:')
        const summarySQL = `
      SELECT 
        PROJECT_ID,
        SUM(day01 + day02 + day03 + day04 + day05 + day06 + day07 + day08 + day09 + day10 +
            day11 + day12 + day13 + day14 + day15 + day16 + day17 + day18 + day19 + day20 +
            day21 + day22 + day23 + day24 + day25 + day26 + day27 + day28 + day29 + day30 + day31) as totalHours
      FROM geppo 
      GROUP BY PROJECT_ID;
    `

        const { stdout: summaryResult } = await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "${summarySQL}" --skip-column-names`)

        summaryResult.trim().split('\n').forEach(line => {
            const [project, hours] = line.split('\t')
            console.log(`  - ${project || '未設定'}: ${hours}時間`)
        })

        console.log('\n🎉 geppoテーブルのシードデータが完了しました!')

        // wbsテーブルのシード
        console.log('\n🌱 MySQL wbsテーブルのシードデータを開始します...')

        // テーブル存在チェック（必要時に作成）
        await ensureTableExists('wbs', '/Users/yuta/Develop/project-managed-app/mysql/init/create-wbs-table.sql')

        console.log('🗑️  既存のwbsデータをクリアしています...')
        await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "DELETE FROM wbs;"`)
        console.log('✅ 既存のwbsデータをクリアしました')

        for (const data of sampleWbsData) {
            const insertWbsSQL = `
        INSERT INTO wbs (
          FILE_NAME, ROW_NO, PROJECT_ID, PROJECT_NAME, WBS_ID, PHASE, ACTIVITY, TASK, KINO_SBT, SUBSYSTEM, TANTO, TANTO_REV,
          KIJUN_START_DATE, KIJUN_END_DATE, KIJUN_KOSU, KIJUN_KOSU_BUFFER, YOTEI_START_DATE, YOTEI_END_DATE, YOTEI_KOSU,
          JISSEKI_START_DATE, JISSEKI_END_DATE, JISSEKI_KOSU, STATUS, IPV_DATE, IBPV_DATE, PV_DATE, EV_DATE, AC_DATE,
          IPV_KOSU, IBPV_KOSU, PV_KOSU, EV_KOSU, AC_KOSU, BIKO, PROGRESS_RATE
        ) VALUES (
          ${data.FILE_NAME ? `'${data.FILE_NAME}'` : 'NULL'},
          ${data.ROW_NO ?? 'NULL'},
          ${data.PROJECT_ID ? `'${data.PROJECT_ID}'` : 'NULL'},
          ${data.PROJECT_NAME ? `'${data.PROJECT_NAME}'` : 'NULL'},
          ${data.WBS_ID ? `'${data.WBS_ID}'` : 'NULL'},
          ${data.PHASE ? `'${data.PHASE}'` : 'NULL'},
          ${data.ACTIVITY ? `'${data.ACTIVITY}'` : 'NULL'},
          ${data.TASK ? `'${data.TASK}'` : 'NULL'},
          ${data.KINO_SBT ? `'${data.KINO_SBT}'` : 'NULL'},
          ${data.SUBSYSTEM ? `'${data.SUBSYSTEM}'` : 'NULL'},
          ${data.TANTO ? `'${data.TANTO}'` : 'NULL'},
          ${data.TANTO_REV ? `'${data.TANTO_REV}'` : 'NULL'},
          ${data.KIJUN_START_DATE ? `'${data.KIJUN_START_DATE}'` : 'NULL'},
          ${data.KIJUN_END_DATE ? `'${data.KIJUN_END_DATE}'` : 'NULL'},
          ${data.KIJUN_KOSU ?? 'NULL'},
          ${data.KIJUN_KOSU_BUFFER ?? 'NULL'},
          ${data.YOTEI_START_DATE ? `'${data.YOTEI_START_DATE}'` : 'NULL'},
          ${data.YOTEI_END_DATE ? `'${data.YOTEI_END_DATE}'` : 'NULL'},
          ${data.YOTEI_KOSU ?? 'NULL'},
          ${data.JISSEKI_START_DATE ? `'${data.JISSEKI_START_DATE}'` : 'NULL'},
          ${data.JISSEKI_END_DATE ? `'${data.JISSEKI_END_DATE}'` : 'NULL'},
          ${data.JISSEKI_KOSU ?? 'NULL'},
          ${data.STATUS ? `'${data.STATUS}'` : 'NULL'},
          ${data.IPV_DATE ? `'${data.IPV_DATE}'` : 'NULL'},
          ${data.IBPV_DATE ? `'${data.IBPV_DATE}'` : 'NULL'},
          ${data.PV_DATE ? `'${data.PV_DATE}'` : 'NULL'},
          ${data.EV_DATE ? `'${data.EV_DATE}'` : 'NULL'},
          ${data.AC_DATE ? `'${data.AC_DATE}'` : 'NULL'},
          ${data.IPV_KOSU ?? 'NULL'},
          ${data.IBPV_KOSU ?? 'NULL'},
          ${data.PV_KOSU ?? 'NULL'},
          ${data.EV_KOSU ?? 'NULL'},
          ${data.AC_KOSU ?? 'NULL'},
          ${data.BIKO ? `'${data.BIKO}'` : 'NULL'},
          ${data.PROGRESS_RATE ?? 'NULL'}
        );
      `

            await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "${insertWbsSQL}"`)
            console.log(`✅ wbsデータを作成しました: ${data.PROJECT_ID} - ${data.WBS_ID}`)
        }

        const { stdout: wbsCountResult } = await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SELECT COUNT(*) as count FROM wbs;" --skip-column-names`)
        const totalWbsRecords = parseInt(wbsCountResult.trim())
        console.log(`\n📊 合計 ${totalWbsRecords} 件のwbsレコードが作成されました`)

        console.log('\n📈 プロジェクト別WBS数:')
        const wbsSummarySQL = `
      SELECT 
        PROJECT_ID,
        COUNT(*) as taskCount
      FROM wbs 
      GROUP BY PROJECT_ID;
    `
        const { stdout: wbsSummaryResult } = await execAsync(`docker exec ${CONTAINER} mysql -u ${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "${wbsSummarySQL}" --skip-column-names`)
        wbsSummaryResult.trim().split('\n').forEach(line => {
            const [project, count] = line.split('\t')
            console.log(`  - ${project || '未設定'}: ${count}件`)
        })

        console.log('\n🎉 wbsテーブルのシードデータが完了しました!')

    } catch (error) {
        console.error('❌ シードデータの実行中にエラーが発生しました:', error)
        process.exit(1)
    }
}

function formatGEPPO_YYYYMM(date: Date): string {
    // YYYY-MM形式に変換
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    console.log(`${year}${month.toString().padStart(2, '0')}`)
    return `${year}${month.toString().padStart(2, '0')}`
}

function formatWbsDate(date: Date): string {
    // YYYY-MM-DD形式に変換
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    console.log(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}
// スクリプト実行
insertSeedData() 