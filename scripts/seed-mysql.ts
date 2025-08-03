import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// MySQL geppoテーブル用のサンプルデータ
const sampleGeppoData = [
    {
        projectName: "Webアプリケーション開発",
        yyyyMM: "2024/12",
        taskName: "フロントエンド開発",
        wbsId: "WBS-001",
        biko: "React コンポーネント実装",
        status: "進行中",
        day01: 8, day02: 7, day03: 8, day04: 6, day05: 8,
        day06: 0, day07: 0, day08: 8, day09: 7, day10: 8,
        day11: 8, day12: 6, day13: 0, day14: 0, day15: 8,
        day16: 7, day17: 8, day18: 8, day19: 7, day20: 0,
        day21: 0, day22: 8, day23: 7, day24: 8, day25: 8,
        day26: 6, day27: 0, day28: 0, day29: 8, day30: 7,
        day31: 0
    },
    {
        projectName: "Webアプリケーション開発",
        yyyyMM: "2024/12",
        taskName: "バックエンドAPI開発",
        wbsId: "WBS-002",
        biko: "REST API実装とテスト",
        status: "進行中",
        day01: 4, day02: 5, day03: 4, day04: 6, day05: 4,
        day06: 0, day07: 0, day08: 4, day09: 5, day10: 4,
        day11: 4, day12: 6, day13: 0, day14: 0, day15: 4,
        day16: 5, day17: 4, day18: 4, day19: 5, day20: 0,
        day21: 0, day22: 4, day23: 5, day24: 4, day25: 4,
        day26: 6, day27: 0, day28: 0, day29: 4, day30: 5,
        day31: 0
    },
    {
        projectName: "データベース設計",
        yyyyMM: "2024/11",
        taskName: "スキーマ設計",
        wbsId: "WBS-003",
        biko: "ER図作成とテーブル設計",
        status: "完了",
        day01: 0, day02: 0, day03: 0, day04: 2, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 0, day10: 0,
        day11: 0, day12: 2, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        projectName: "システムテスト",
        yyyyMM: "2025/01",
        taskName: "結合テスト",
        wbsId: "WBS-004",
        biko: "各モジュール間のテスト実施",
        status: "待機中",
        day01: 0, day02: 0, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 0, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 0, day17: 0, day18: 0, day19: 0, day20: 0,
        day21: 0, day22: 0, day23: 0, day24: 0, day25: 0,
        day26: 0, day27: 0, day28: 0, day29: 0, day30: 0,
        day31: 0
    },
    {
        projectName: "ドキュメント作成",
        yyyyMM: "2024/12",
        taskName: "技術仕様書作成",
        wbsId: "WBS-005",
        biko: "システム仕様書の作成",
        status: "進行中",
        day01: 0, day02: 2, day03: 0, day04: 0, day05: 0,
        day06: 0, day07: 0, day08: 0, day09: 2, day10: 0,
        day11: 0, day12: 0, day13: 0, day14: 0, day15: 0,
        day16: 2, day17: 0, day18: 0, day19: 2, day20: 0,
        day21: 0, day22: 0, day23: 2, day24: 0, day25: 0,
        day26: 2, day27: 0, day28: 0, day29: 0, day30: 2,
        day31: 0
    }
]

async function insertSeedData() {
    console.log('🌱 MySQL geppoテーブルのシードデータを開始します...')

    try {
        // 既存データをクリア
        console.log('🗑️  既存のgeppoデータをクリアしています...')
        await execAsync(`docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "DELETE FROM geppo;"`)
        console.log('✅ 既存のgeppoデータをクリアしました')

        // サンプルデータを挿入
        for (const [index, data] of sampleGeppoData.entries()) {
            const uuid = `geppo-${index.toString().padStart(3, '0')}-${Date.now()}`

            const insertSQL = `
        INSERT INTO geppo (
          id, projectName, yyyyMM, taskName, wbsId, biko, status,
          day01, day02, day03, day04, day05, day06, day07, day08, day09, day10,
          day11, day12, day13, day14, day15, day16, day17, day18, day19, day20,
          day21, day22, day23, day24, day25, day26, day27, day28, day29, day30, day31
        ) VALUES (
          '${uuid}', 
          ${data.projectName ? `'${data.projectName.replace(/'/g, "\\'")}'` : 'NULL'},
          ${data.yyyyMM ? `'${data.yyyyMM}'` : 'NULL'},
          ${data.taskName ? `'${data.taskName.replace(/'/g, "\\'")}'` : 'NULL'},
          ${data.wbsId ? `'${data.wbsId}'` : 'NULL'},
          ${data.biko ? `'${data.biko.replace(/'/g, "\\'")}'` : 'NULL'},
          ${data.status ? `'${data.status}'` : 'NULL'},
          ${data.day01}, ${data.day02}, ${data.day03}, ${data.day04}, ${data.day05},
          ${data.day06}, ${data.day07}, ${data.day08}, ${data.day09}, ${data.day10},
          ${data.day11}, ${data.day12}, ${data.day13}, ${data.day14}, ${data.day15},
          ${data.day16}, ${data.day17}, ${data.day18}, ${data.day19}, ${data.day20},
          ${data.day21}, ${data.day22}, ${data.day23}, ${data.day24}, ${data.day25},
          ${data.day26}, ${data.day27}, ${data.day28}, ${data.day29}, ${data.day30}, ${data.day31}
        );
      `

            await execAsync(`docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "${insertSQL}"`)
            console.log(`✅ geppoデータを作成しました: ${data.projectName} - ${data.taskName}`)
        }

        // 作成されたデータの統計を表示
        const { stdout: countResult } = await execAsync(`docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "SELECT COUNT(*) as count FROM geppo;" --skip-column-names`)
        const totalRecords = parseInt(countResult.trim())
        console.log(`\n📊 合計 ${totalRecords} 件のgeppoレコードが作成されました`)

        // プロジェクト別作業時間集計を表示
        console.log('\n📈 プロジェクト別作業時間集計:')
        const summarySQL = `
      SELECT 
        projectName,
        SUM(day01 + day02 + day03 + day04 + day05 + day06 + day07 + day08 + day09 + day10 +
            day11 + day12 + day13 + day14 + day15 + day16 + day17 + day18 + day19 + day20 +
            day21 + day22 + day23 + day24 + day25 + day26 + day27 + day28 + day29 + day30 + day31) as totalHours
      FROM geppo 
      GROUP BY projectName;
    `

        const { stdout: summaryResult } = await execAsync(`docker exec project-managed-mysql-test mysql -u test_user -ptest_password project_managed_test -e "${summarySQL}" --skip-column-names`)

        summaryResult.trim().split('\n').forEach(line => {
            const [project, hours] = line.split('\t')
            console.log(`  - ${project || '未設定'}: ${hours}時間`)
        })

        console.log('\n🎉 geppoテーブルのシードデータが完了しました!')

    } catch (error) {
        console.error('❌ シードデータの実行中にエラーが発生しました:', error)
        process.exit(1)
    }
}

// スクリプト実行
insertSeedData() 