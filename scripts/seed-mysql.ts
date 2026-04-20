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

/** prisma/mock-data.ts のプロジェクト期間（3ヶ月）に合わせる */
const baseDate = new Date("2026-01-01T00:00:00.000Z")
const addDays = (days: number): Date => {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + days)
    return date
}

let geppoRowNo = 1

const PROJECT_ID = "新規機能開発A"

const dummyCOMPANY_NAME = "株式会社テスト"
const dummyMEMBER_NAME = "テスト太郎"
const dummyPROJECT_SUB_ID = "SUB-001"
const dummyWBS_NAME = "新規機能開発A"

/** メンバー5人分の月次稼働サンプル（WBS_NOは代表タスク） */
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
        WORK_NAME: "詳細設計_機能A",
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
        WORK_NAME: "詳細設計_機能B",
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
        MEMBER_ID: "dummy03",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D3-0001",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "製造_機能A",
        WORK_STATUS: "進行中",
        day01: 0, day02: 0, day03: 0, day04: 2, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 2, day10: 0,
        day11: 0, day12: 2, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        MEMBER_ID: "dummy04",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D4-0001",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "単体テスト_機能A",
        WORK_STATUS: "進行中",
        day01: 0, day02: 0, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 0, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        MEMBER_ID: "dummy05",
        GEPPO_YYYYMM: formatGEPPO_YYYYMM(baseDate),
        ROW_NO: geppoRowNo++,
        COMPANY_NAME: dummyCOMPANY_NAME,
        MEMBER_NAME: dummyMEMBER_NAME,
        PROJECT_ID: PROJECT_ID,
        PROJECT_SUB_ID: dummyPROJECT_SUB_ID,
        WBS_NO: "D9-0001",
        WBS_NAME: dummyWBS_NAME,
        WORK_NAME: "プロジェクト管理_機能A",
        WORK_STATUS: "進行中",
        day01: 0, day02: 2, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 2, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 2, day17: 0, day18: 0, day19: 2, day20: 0,
        day21: 0, day22: 0, day23: 2, day24: 0, day25: 0,
        day26: 2, day27: 0, day28: 0, day29: 0, day30: 2,
        day31: 0
    },
]

// MySQL wbs: フェーズ4×タスク5＝20行 ＋ 同一TASK名の追加行1（多レビュアー検証）
// TANTO: Users.displayName（WbsSyncApplicationService が wbs_assignee.userName と照合。src/data/users.ts と一致させる）
// TANTO_REV: Users.id（dummy01…。品質の SyncQualityTargetsService が reviewerUserId にそのまま使用）
let wbsRowNo = 0

/** dummy01〜05 に対応する表示名（findByWbsId の userName = assignee.displayName と一致させる） */
const TANTO_DISPLAY_NAMES = ['安田', '山田', '鈴木', '佐藤', '田中'] as const
const PHASES = [
    { name: '詳細設計', prefix: 'D2', kino: '設計', subsystem: '設計書' },
    { name: '製造', prefix: 'D3', kino: '機能', subsystem: '実装' },
    { name: '単体テスト', prefix: 'D4', kino: 'テスト', subsystem: '自動化' },
    { name: 'プロジェクト管理', prefix: 'D9', kino: '管理', subsystem: 'PMO' },
] as const
const LABELS = ['A', 'B', 'C', 'D', 'E'] as const

function pad4(n: number) {
    return String(n).padStart(4, '0')
}

function buildWbsRows() {
    const rows: Array<Record<string, unknown>> = []
    let idx = 0
    for (const ph of PHASES) {
        for (let i = 0; i < 5; i++) {
            const wbsId = `${ph.prefix}-${pad4(i + 1)}`
            const taskName = `${ph.name}_機能${LABELS[i]}`
            const tanto = TANTO_DISPLAY_NAMES[i]
            let tantoRev: string | null = null
            if (ph.prefix === 'D2' && i === 0) tantoRev = 'dummy02'
            if (ph.prefix === 'D3' && i === 0) tantoRev = 'dummy04'
            if (ph.prefix === 'D4' && i === 0) tantoRev = 'dummy05'
            if (ph.prefix === 'D9' && i === 2) tantoRev = 'dummy01'

            const startOffset = idx * 4
            const endOffset = startOffset + 16
            const kijunStart = formatWbsDate(addDays(startOffset))
            const kijunEnd = formatWbsDate(addDays(endOffset))
            const yoteiKosu = 40 + (idx % 5) * 8
            const jissekiKosu = idx % 3 === 0 ? yoteiKosu - 4 : null

            rows.push({
                FILE_NAME: 'seed-wbs-main.csv',
                ROW_NO: wbsRowNo++,
                PROJECT_ID: PROJECT_ID,
                PROJECT_NAME: PROJECT_ID,
                WBS_ID: wbsId,
                PHASE: ph.name,
                ACTIVITY: `ACT-${ph.prefix}-${i + 1}`,
                TASK: taskName,
                KINO_SBT: ph.kino,
                SUBSYSTEM: ph.subsystem,
                TANTO: tanto,
                TANTO_REV: tantoRev,
                KIJUN_START_DATE: kijunStart,
                KIJUN_END_DATE: kijunEnd,
                KIJUN_KOSU: yoteiKosu,
                KIJUN_KOSU_BUFFER: 4,
                YOTEI_START_DATE: kijunStart,
                YOTEI_END_DATE: kijunEnd,
                YOTEI_KOSU: yoteiKosu,
                JISSEKI_START_DATE: jissekiKosu !== null ? kijunStart : null,
                JISSEKI_END_DATE: jissekiKosu !== null ? formatWbsDate(addDays(startOffset + 10)) : null,
                JISSEKI_KOSU: jissekiKosu,
                STATUS: idx % 4 === 0 ? '完了' : '進行中',
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
                BIKO: `seed: ${wbsId} ${taskName}`,
                PROGRESS_RATE: idx % 20 === 0 ? 100 : Math.min(95, 30 + idx),
            })
            idx++
        }
    }
    rows.push({
        FILE_NAME: 'seed-wbs-quality-dup.csv',
        ROW_NO: wbsRowNo++,
        PROJECT_ID: PROJECT_ID,
        PROJECT_NAME: PROJECT_ID,
        WBS_ID: 'D9-0098',
        PHASE: 'プロジェクト管理',
        ACTIVITY: '品質',
        TASK: '詳細設計_機能A',
        KINO_SBT: '管理',
        SUBSYSTEM: 'レビュー',
        TANTO: '佐藤',
        TANTO_REV: 'dummy03',
        KIJUN_START_DATE: '2026-01-01',
        KIJUN_END_DATE: '2026-01-10',
        KIJUN_KOSU: 80,
        KIJUN_KOSU_BUFFER: 0,
        YOTEI_START_DATE: '2026-01-01',
        YOTEI_END_DATE: '2026-01-10',
        YOTEI_KOSU: 80,
        JISSEKI_START_DATE: null,
        JISSEKI_END_DATE: null,
        JISSEKI_KOSU: 0,
        STATUS: '進行中',
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
        BIKO: 'seed: 詳細設計_機能A の2人目レビュアー（reviewTaskNo=D9-0098）',
        PROGRESS_RATE: 0,
    })
    return rows
}

const wbsData = buildWbsRows()
const sampleWbsData = wbsData

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