const baseDate = new Date();
const addDays = (days: number): Date => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date;
};

export const mockData = {
    project: {
        id: 1,
        name: "新規機能開発",
        status: "ACTIVE",
        description: "テストプロジェクト",
        startDate: baseDate,
        endDate: addDays(90),
    },
    wbs: [
        {
            id: 1,
            projectId: 1,
            name: "新規機能開発",
            status: "NOT_STARTED",
        },
    ],
    wbsAssignee: [
        {
            id: 1,
            wbsId: 1,
            assigneeId: "dummy01",
        },
        {
            id: 2,
            wbsId: 1,
            assigneeId: "dummy02",
        },
        {
            id: 3,
            wbsId: 1,
            assigneeId: "dummy03",
        },
        {
            id: 4,
            wbsId: 1,
            assigneeId: "dummy04",
        },

    ],
    wbsPhase: [
        {
            id: 1,
            wbsId: 1,
            name: "詳細設計",
            code: "D2",
            seq: 1,
        },
        {
            id: 2,
            wbsId: 1,
            name: "開発",
            code: "D3",
            seq: 2,
        },
        {
            id: 3,
            wbsId: 1,
            name: "単体テスト",
            code: "D4",
            seq: 3,
        },
        {
            id: 4,
            wbsId: 1,
            name: "ユーザーテスト",
            code: "D5",
            seq: 4,
        },
    ],
    wbsTask: [
        {
            id: 1,
            taskNo: "D2-0001",
            wbsId: 1,
            phaseId: 1,
            name: "機能A設計書",
            assigneeId: 1,
            status: "NOT_STARTED",
            startDate: baseDate,
            endDate: addDays(5),
            kosu: 15,
        },
        {
            id: 2,
            taskNo: "D2-0002",
            wbsId: 1,
            phaseId: 1,
            name: "機能B設計書",
            assigneeId: 2,
            status: "NOT_STARTED",
            startDate: addDays(1),
            endDate: addDays(7),
            kosu: 20,
        },
        {
            id: 3,
            taskNo: "D2-0003",
            wbsId: 1,
            phaseId: 1,
            name: "機能C設計書",
            assigneeId: 3,
            status: "NOT_STARTED",
            startDate: addDays(2),
            endDate: addDays(9),
            kosu: 25,
        },
        {
            id: 4,
            taskNo: "D3-0001",
            wbsId: 1,
            phaseId: 2,
            name: "機能A開発",
            assigneeId: 1,
            status: "NOT_STARTED",
            startDate: addDays(10),
            endDate: addDays(45),
            kosu: 40,
        },
        {
            id: 5,
            taskNo: "D3-0002",
            wbsId: 1,
            phaseId: 2,
            name: "機能B開発",
            assigneeId: 2,
            status: "NOT_STARTED",
            startDate: addDays(12),
            endDate: addDays(30),
            kosu: 30,
        },
        {
            id: 6,
            taskNo: "D3-0003",
            wbsId: 1,
            phaseId: 2,
            name: "機能C開発",
            assigneeId: 3,
            status: "NOT_STARTED",
            startDate: addDays(15),
            endDate: addDays(50),
            kosu: 35,
        },
        {
            id: 7,
            taskNo: "D4-0001",
            wbsId: 1,
            phaseId: 3,
            name: "機能A単体テスト",
            assigneeId: 1,
            status: "NOT_STARTED",
            startDate: addDays(46),
            endDate: addDays(55),
            kosu: 15,
        },
        {
            id: 8,
            taskNo: "D4-0002",
            wbsId: 1,
            phaseId: 3,
            name: "機能B単体テスト",
            assigneeId: 2,
            status: "NOT_STARTED",
            startDate: addDays(51),
            endDate: addDays(60),
            kosu: 15,
        },
        {
            id: 9,
            taskNo: "D5-0001",
            wbsId: 1,
            phaseId: 4,
            name: "機能Aユーザーテスト",
            assigneeId: 1,
            status: "NOT_STARTED",
            startDate: addDays(61),
            endDate: addDays(65),
            kosu: 10,
        },
        {
            id: 10,
            taskNo: "D5-0002",
            wbsId: 1,
            phaseId: 4,
            name: "機能Bユーザーテスト",
            assigneeId: 2,
            status: "NOT_STARTED",
            startDate: addDays(61),
            endDate: addDays(65),
            kosu: 10,
        },
        {
            id: 11,
            taskNo: "D5-0003",
            wbsId: 1,
            phaseId: 4,
            name: "機能Cユーザーテスト",
            assigneeId: 3,
            status: "NOT_STARTED",
            startDate: addDays(61),
            endDate: addDays(65),
            kosu: 10,
        },
        {
            id: 12,
            taskNo: "D2-0004",
            wbsId: 1,
            phaseId: 1,
            name: "機能D設計書",
            assigneeId: 4,
            status: "NOT_STARTED",
            startDate: addDays(1),
            endDate: addDays(40),
            kosu: 50,
        },
    ],
    wbsBuffer: [
        {
            id: 1,
            wbsId: 1,
            name: "リスク対策工数",
            buffer: 50,
            bufferType: "RISK",
        },
    ],

    workRecords: [
        {
            id: 1,
            userId: "dummy01",
            taskId: 1,
            date: addDays(0),
            hours_worked: 7.5,
        },
        {
            id: 2,
            userId: "dummy01",
            taskId: 1,
            date: addDays(1),
            hours_worked: 7.5,
        },
        {
            id: 3,
            userId: "dummy01",
            taskId: 4,
            date: addDays(11),
            hours_worked: 8,
        },
        {
            id: 4,
            userId: "dummy01",
            taskId: 4,
            date: addDays(12),
            hours_worked: 8,
        },
        {
            id: 5,
            userId: "dummy02",
            taskId: 2,
            date: addDays(2),
            hours_worked: 8,
        },
        {
            id: 6,
            userId: "dummy02",
            taskId: 2,
            date: addDays(3),
            hours_worked: 8,
        },
        {
            id: 7,
            userId: "dummy02",
            taskId: 5,
            date: addDays(13),
            hours_worked: 8,
        },
        {
            id: 8,
            userId: "dummy02",
            taskId: 5,
            date: addDays(14),
            hours_worked: 8,
        },
        {
            id: 9,
            userId: "dummy03",
            taskId: 3,
            date: addDays(4),
            hours_worked: 8,
        },
        {
            id: 10,
            userId: "dummy03",
            taskId: 6,
            date: addDays(16),
            hours_worked: 8,
        },
    ],
    milestone: [
        {
            id: 1,
            wbsId: 1,
            name: "キックオフ",
            date: addDays(0),
        },
        {
            id: 2,
            wbsId: 1,
            name: "設計完了",
            date: addDays(9),
        },
        {
            id: 3,
            wbsId: 1,
            name: "開発完了",
            date: addDays(50),
        },
        {
            id: 4,
            wbsId: 1,
            name: "リリース",
            date: addDays(70),
        },
    ],
};

// 大量データ
export const mockDataLarge = {
    project: {
        id: 2,
        name: "大規模開発プロジェクト",
        status: "ACTIVE",
        description: "大規模開発プロジェクト",
        startDate: baseDate,
        endDate: addDays(120),
    },
    wbs: [{
        id: 2,
        projectId: 2,
        name: "タスク01",
        status: "NOT_STARTED",
    }],
    wbsAssignee: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        wbsId: 2,
        assigneeId: `dummy${String(Math.floor(Math.random() * 13) + 1).padStart(2, '0')}`, // 01~13のユーザーからランダムに選択（末尾2桁は0埋め）
    })),
    wbsPhase: [{
        id: 1,
        wbsId: 2,
        name: "詳細設計",
        code: "D2",
        seq: 1,
    },
    {
        id: 2,
        wbsId: 2,
        name: "開発",
        code: "D3",
        seq: 2,
    },
    {
        id: 3,
        wbsId: 2,
        name: "単体テスト",
        code: "D4",
        seq: 3,
    },
    {
        id: 4,
        wbsId: 2,
        name: "ユーザーテスト",
        code: "D5",
        seq: 4,
    },
    ],
    wbsTask: Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        taskNo: `D2-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D2-0001~D2-000100）
        wbsId: 2,
        phaseId: Math.floor(Math.random() * 4) + 1,
        name: `機能${i + 1}`,
        assigneeId: Math.floor(Math.random() * 10) + 1,
        status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
        startDate: addDays(i),
        endDate: addDays(i + 5),
        kosu: Math.floor(Math.random() * 10) + 10,
    })),
    wbsBuffer: [{
        id: 1,
        wbsId: 1,
        name: "リスク対策工数",
        buffer: 50,
        bufferType: "RISK",
    }],
    workRecords: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        userId: `dummy${String(Math.floor(Math.random() * 13) + 1).padStart(2, '0')}`,
        taskId: Math.floor(Math.random() * 100) + 1,
        date: addDays(i),
        hours_worked: 8,
    })),
    milestone: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        wbsId: 1,
        name: `マイルストーン${i + 1} `,
        date: addDays(i),
    })),
}

// プロジェクトデータ
export const mockDataProjects = [
    {
        id: 10,
        name: "未開始プロジェクト",
        status: "INACTIVE",
        description: "未開始プロジェクト",
        startDate: addDays(10),
        endDate: addDays(20),
    },
    {
        id: 11,
        name: "進行中プロジェクト",
        status: "ACTIVE",
        description: "進行中プロジェクト",
        startDate: addDays(-10),
        endDate: addDays(20),
    },
    {
        id: 12,
        name: "完了プロジェクト",
        status: "DONE",
        description: "完了プロジェクト",
        startDate: addDays(-20),
        endDate: addDays(-10),
    },
    {
        id: 13,
        name: "キャンセルプロジェクト",
        status: "CANCELLED",
        description: "キャンセルプロジェクト",
        startDate: addDays(10),
        endDate: addDays(20),
    },
    {
        id: 14,
        name: "保留プロジェクト",
        status: "PENDING",
        description: "保留プロジェクト",
        startDate: addDays(10),
        endDate: addDays(20),
    },
    {
        id: 15,
        name: "期限前プロジェクト",
        status: "ACTIVE",
        description: "期限前プロジェクト",
        startDate: addDays(-10),
        endDate: addDays(5),
    },
    {
        id: 16,
        name: "期限後プロジェクト",
        status: "ACTIVE",
        description: "期限後プロジェクト",
        startDate: addDays(-10),
        endDate: addDays(-1),
    },
]

export const importTestData = {
    project: {
        id: 20,
        name: "インポートテスト",
        status: "ACTIVE",
        description: "インポートテスト",
        startDate: baseDate,
        endDate: addDays(10),
    },
    wbs: [
        {
            id: 20,
            projectId: 20,
            name: "インポートテスト",
        },
    ],
    wbsAssignee: [
        {
            id: 20,
            wbsId: 20,
            assigneeId: "dummy01",
        },
        {
            id: 21,
            wbsId: 20,
            assigneeId: "dummy02",
        }
    ],
    wbsPhase: [
        {
            id: 20,
            wbsId: 20,
            name: "詳細設計",
            code: "D2",
            seq: 1,
        },
        {
            id: 21,
            wbsId: 20,
            name: "単体開発",
            code: "D3",
            seq: 2,
        },
    ],
    wbsTask: [
        {
            id: 20,
            taskNo: "D2-0001",
            wbsId: 20,
            phaseId: 1,
            name: "ドキュメント作成",
            assigneeId: 20,
            status: "NOT_STARTED",
            startDate: baseDate,
            endDate: addDays(5),
            kosu: 15,
        },
        {
            id: 21,
            taskNo: "D2-0002",
            wbsId: 20,
            phaseId: 1,
            name: "ドキュメント作成",
            assigneeId: 21,
            status: "NOT_STARTED",
            startDate: addDays(1),
            endDate: addDays(7),
            kosu: 20,
        }
    ],
    wbsBuffer: [
        {
            id: 1,
            wbsId: 1,
            name: "リスク対策工数",
            buffer: 50,
            bufferType: "RISK",
        },
    ],

    workRecords: [
        {
            id: 20,
            userId: "dummy01",
            taskId: 20,
            date: addDays(0),
            hours_worked: 7.5,
        },
        {
            id: 21,
            userId: "dummy01",
            taskId: 21,
            date: addDays(1),
            hours_worked: 30,
        }
    ],
    milestone: [
        {
            id: 20,
            wbsId: 20,
            name: "キックオフ",
            date: addDays(0),
        },
        {
            id: 21,
            wbsId: 20,
            name: "設計完了",
            date: addDays(9),
        },
        {
            id: 22,
            wbsId: 20,
            name: "開発完了",
            date: addDays(50),
        },
        {
            id: 23,
            wbsId: 20,
            name: "リリース",
            date: addDays(70),
        },
    ],
}

export const importTestData2 = {
    project: {
        id: 30,
        name: "インポートテスト2",
        status: "ACTIVE",
        description: "インポートテスト2",
        startDate: baseDate,
        endDate: addDays(10),
    },
    wbs: [
        {
            id: 30,
            projectId: 30,
            name: "インポートテスト2",
        },
    ],
    wbsAssignee: [
        {
            id: 30,
            wbsId: 30,
            assigneeId: "dummy01",
        },
        {
            id: 31,
            wbsId: 30,
            assigneeId: "dummy02",
        },
    ],
    wbsPhase: [
        {
            id: 30,
            wbsId: 30,
            name: "詳細設計",
            code: "D2",
            seq: 1,
        },
    ],
    wbsTask: [
        {
            id: 30,
            taskNo: "D2-0001",
            wbsId: 30,
            phaseId: 1,
            name: "更新前のタスク",
            assigneeId: 30,
            status: "NOT_STARTED",
            startDate: baseDate,
            endDate: addDays(5),
            kosu: 15,
        },
        {
            id: 32,
            taskNo: "D2-0002",
            wbsId: 30,
            phaseId: 1,
            name: "削除されるタスク",
            assigneeId: 31,
            status: "NOT_STARTED",
            startDate: addDays(1),
            endDate: addDays(15),
            kosu: 20,
        },
    ],
    wbsBuffer: [
        {
            id: 1,
            wbsId: 1,
            name: "リスク対策工数",
            buffer: 50,
            bufferType: "RISK",
        },
    ],
    workRecords: [
        {
            id: 30,
            userId: "dummy01",
            taskId: 30,
            date: addDays(0),
            hours_worked: 7.5,
        },
    ],
    milestone: [
        {
            id: 30,
            wbsId: 30,
            name: "キックオフ",
            date: addDays(0),
        },
    ],
}

// 営業日案分ロジックのテストデータ
export const proportionalAllocationTestData = {
    project: {
        id: 40,
        name: "営業日案分テスト",
        status: "ACTIVE",
        description: "営業日案分ロジックのテスト用プロジェクト",
        startDate: baseDate,
        endDate: addDays(60),
    },
    wbs: [
        {
            id: 40,
            projectId: 40,
            name: "営業日案分テスト",
            status: "IN_PROGRESS",
        },
    ],
    wbsAssignee: [
        {
            id: 40,
            wbsId: 40,
            assigneeId: "dummy01", // フルタイム（稼働率1.0）
            rate: 1.0,
        },
        {
            id: 41,
            wbsId: 40,
            assigneeId: "dummy02", // パートタイム（稼働率0.5）
            rate: 0.5,
        },
        {
            id: 42,
            wbsId: 40,
            assigneeId: "dummy03", // フルタイム（稼働率1.0）
            rate: 1.0,
        },
    ],
    wbsPhase: [
        {
            id: 40,
            wbsId: 40,
            name: "設計・開発",
            code: "D1",
            seq: 1,
        },
    ],
    // 月をまたぐタスク群 - 営業日案分が必要
    wbsTask: [
        {
            id: 40,
            taskNo: "D1-0001",
            wbsId: 40,
            phaseId: 40,
            name: "月またぎタスクA（フルタイム担当）",
            assigneeId: 40,
            status: "IN_PROGRESS",
            startDate: addDays(25), // 今月末
            endDate: addDays(35),   // 来月上旬
            kosu: 80, // 80時間 = 約2週間分の工数
        },
        {
            id: 41,
            taskNo: "D1-0002", 
            wbsId: 40,
            phaseId: 40,
            name: "月またぎタスクB（パートタイム担当）",
            assigneeId: 41,
            status: "IN_PROGRESS",
            startDate: addDays(20),
            endDate: addDays(45),
            kosu: 60, // パートタイム考慮で60時間
        },
        {
            id: 42,
            taskNo: "D1-0003",
            wbsId: 40,
            phaseId: 40,
            name: "長期月またぎタスク（3ヶ月間）",
            assigneeId: 42,
            status: "IN_PROGRESS",
            startDate: addDays(15),
            endDate: addDays(75), // 3ヶ月後
            kosu: 240, // 3ヶ月分の工数
        },
        {
            id: 43,
            taskNo: "D1-0004",
            wbsId: 40,
            phaseId: 40,
            name: "年末年始またぎタスク",
            assigneeId: 40,
            status: "NOT_STARTED",
            startDate: new Date(baseDate.getFullYear(), 11, 25), // 12/25
            endDate: new Date(baseDate.getFullYear() + 1, 0, 10), // 1/10
            kosu: 40,
        },
    ],
    wbsBuffer: [
        {
            id: 40,
            wbsId: 40,
            name: "営業日案分バッファ",
            buffer: 20,
            bufferType: "RISK",
        },
    ],
    workRecords: [
        {
            id: 40,
            userId: "dummy01",
            taskId: 40,
            date: addDays(25),
            hours_worked: 7.5,
        },
        {
            id: 41,
            userId: "dummy02",
            taskId: 41,
            date: addDays(20),
            hours_worked: 4.0, // パートタイム
        },
    ],
    milestone: [
        {
            id: 40,
            wbsId: 40,
            name: "設計完了（月またぎ）",
            date: addDays(30),
        },
        {
            id: 41,
            wbsId: 40,
            name: "開発完了（月またぎ）",
            date: addDays(60),
        },
    ],
    // 会社休日データ
    companyHolidays: [
        {
            id: 1,
            date: new Date(baseDate.getFullYear(), 11, 29), // 12/29
            name: "年末特別休暇",
            type: "COMPANY",
        },
        {
            id: 2,
            date: new Date(baseDate.getFullYear(), 11, 30), // 12/30
            name: "年末特別休暇",
            type: "COMPANY",
        },
        {
            id: 3,
            date: new Date(baseDate.getFullYear() + 1, 0, 2), // 1/2
            name: "年始特別休暇",
            type: "COMPANY",
        },
        {
            id: 4,
            date: new Date(baseDate.getFullYear() + 1, 0, 3), // 1/3
            name: "年始特別休暇",
            type: "COMPANY",
        },
    ],
    // ユーザースケジュール（個人の休暇・予定）
    userSchedules: [
        {
            id: 40,
            userId: "dummy01",
            date: addDays(27),
            title: "有給休暇",
            type: "VACATION",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        {
            id: 41,
            userId: "dummy01",
            date: addDays(28),
            title: "午後半休",
            type: "HALF_VACATION",
            isAllDay: false,
            scheduledHours: 3.75,
        },
        {
            id: 42,
            userId: "dummy02",
            date: addDays(22),
            title: "病院",
            type: "PRIVATE",
            isAllDay: false,
            scheduledHours: 2.0,
        },
        {
            id: 43,
            userId: "dummy03",
            date: addDays(30),
            title: "研修参加",
            type: "TRAINING",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        {
            id: 44,
            userId: "dummy03",
            date: addDays(45),
            title: "夏季休暇",
            type: "VACATION",
            isAllDay: true,
            scheduledHours: 7.5,
        },
    ],
}

// 営業日案分の検証用複雑パターン
export const complexProportionalTestData = {
    project: {
        id: 50,
        name: "営業日案分検証（複雑パターン）",
        status: "ACTIVE",
        description: "様々な条件での営業日案分の動作を検証するテスト",
        startDate: baseDate,
        endDate: addDays(90),
    },
    wbs: [
        {
            id: 50,
            projectId: 50,
            name: "営業日案分検証",
            status: "IN_PROGRESS",
        },
    ],
    wbsAssignee: [
        {
            id: 50,
            wbsId: 50,
            assigneeId: "dummy05", // 管理者（稼働率0.8）
            rate: 0.8,
        },
        {
            id: 51,
            wbsId: 50,
            assigneeId: "dummy06", // 新人（稼働率0.6）
            rate: 0.6,
        },
        {
            id: 52,
            wbsId: 50,
            assigneeId: "dummy07", // 外部委託（稼働率0.3）
            rate: 0.3,
        },
    ],
    wbsPhase: [
        {
            id: 50,
            wbsId: 50,
            name: "複雑案分テスト",
            code: "CPX",
            seq: 1,
        },
    ],
    wbsTask: [
        // 祝日・連休をまたぐタスク
        {
            id: 50,
            taskNo: "CPX-0001",
            wbsId: 50,
            phaseId: 50,
            name: "GW連休またぎタスク",
            assigneeId: 50,
            status: "IN_PROGRESS",
            startDate: new Date(baseDate.getFullYear(), 3, 27), // 4/27
            endDate: new Date(baseDate.getFullYear(), 4, 8),   // 5/8
            kosu: 32, // GW前後の営業日で案分
        },
        // 多数の個人休暇があるタスク
        {
            id: 51,
            taskNo: "CPX-0002",
            wbsId: 50,
            phaseId: 50,
            name: "多数個人休暇またぎタスク",
            assigneeId: 51,
            status: "IN_PROGRESS",
            startDate: addDays(5),
            endDate: addDays(25),
            kosu: 48,
        },
        // 稼働率の低い外部委託者のタスク
        {
            id: 52,
            taskNo: "CPX-0003",
            wbsId: 50,
            phaseId: 50,
            name: "外部委託案分タスク",
            assigneeId: 52,
            status: "IN_PROGRESS",
            startDate: addDays(10),
            endDate: addDays(40),
            kosu: 36,
        },
        // 年度末またぎタスク
        {
            id: 53,
            taskNo: "CPX-0004",
            wbsId: 50,
            phaseId: 50,
            name: "年度末またぎタスク",
            assigneeId: 50,
            status: "NOT_STARTED",
            startDate: new Date(baseDate.getFullYear(), 2, 20), // 3/20
            endDate: new Date(baseDate.getFullYear(), 3, 10),   // 4/10
            kosu: 60,
        },
    ],
    // 複雑な会社休日パターン
    companyHolidays: [
        // GW特別休暇
        {
            id: 10,
            date: new Date(baseDate.getFullYear(), 3, 30), // 4/30
            name: "GW特別休暇",
            type: "COMPANY",
        },
        {
            id: 11,
            date: new Date(baseDate.getFullYear(), 4, 1), // 5/1
            name: "GW特別休暇",
            type: "COMPANY",
        },
        {
            id: 12,
            date: new Date(baseDate.getFullYear(), 4, 2), // 5/2
            name: "GW特別休暇",
            type: "COMPANY",
        },
        // 夏季休暇
        {
            id: 13,
            date: new Date(baseDate.getFullYear(), 7, 13), // 8/13
            name: "夏季休暇",
            type: "COMPANY",
        },
        {
            id: 14,
            date: new Date(baseDate.getFullYear(), 7, 14), // 8/14
            name: "夏季休暇",
            type: "COMPANY",
        },
        {
            id: 15,
            date: new Date(baseDate.getFullYear(), 7, 15), // 8/15
            name: "夏季休暇",
            type: "COMPANY",
        },
    ],
    // 複雑なユーザースケジュール
    userSchedules: [
        // dummy05（管理者）の予定
        {
            id: 50,
            userId: "dummy05",
            date: addDays(7),
            title: "取締役会",
            type: "MEETING",
            isAllDay: false,
            scheduledHours: 4.0,
        },
        {
            id: 51,
            userId: "dummy05",
            date: addDays(14),
            title: "出張",
            type: "BUSINESS_TRIP",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        {
            id: 52,
            userId: "dummy05",
            date: addDays(21),
            title: "午前半休",
            type: "HALF_VACATION",
            isAllDay: false,
            scheduledHours: 3.75,
        },
        // dummy06（新人）の予定
        {
            id: 53,
            userId: "dummy06",
            date: addDays(8),
            title: "新人研修",
            type: "TRAINING",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        {
            id: 54,
            userId: "dummy06",
            date: addDays(9),
            title: "新人研修",
            type: "TRAINING",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        {
            id: 55,
            userId: "dummy06",
            date: addDays(15),
            title: "メンター面談",
            type: "MEETING",
            isAllDay: false,
            scheduledHours: 2.0,
        },
        {
            id: 56,
            userId: "dummy06",
            date: addDays(22),
            title: "体調不良",
            type: "SICK_LEAVE",
            isAllDay: true,
            scheduledHours: 7.5,
        },
        // dummy07（外部委託）の予定
        {
            id: 57,
            userId: "dummy07",
            date: addDays(12),
            title: "他社案件",
            type: "EXTERNAL_WORK",
            isAllDay: false,
            scheduledHours: 4.5, // 稼働時間のさらに一部を削減
        },
        {
            id: 58,
            userId: "dummy07",
            date: addDays(18),
            title: "他社案件",
            type: "EXTERNAL_WORK",
            isAllDay: false,
            scheduledHours: 5.0,
        },
        {
            id: 59,
            userId: "dummy07",
            date: addDays(25),
            title: "契約更新面談",
            type: "MEETING",
            isAllDay: false,
            scheduledHours: 2.0,
        },
    ],
    workRecords: [
        {
            id: 50,
            userId: "dummy05",
            taskId: 50,
            date: addDays(5),
            hours_worked: 6.0, // 管理者稼働率0.8を反映
        },
        {
            id: 51,
            userId: "dummy06",
            taskId: 51,
            date: addDays(6),
            hours_worked: 4.5, // 新人稼働率0.6を反映
        },
        {
            id: 52,
            userId: "dummy07",
            taskId: 52,
            date: addDays(11),
            hours_worked: 2.25, // 外部委託稼働率0.3を反映
        },
    ],
    milestone: [
        {
            id: 40,
            wbsId: 40,
            name: "設計完了（月またぎ）",
            date: addDays(30),
        },
        {
            id: 41,
            wbsId: 40,
            name: "開発完了（月またぎ）",
            date: addDays(60),
        },
    ],
    wbsBuffer: [
        {
            id: 40,
            wbsId: 40,
            name: "営業日案分バッファ",
            buffer: 20,
            bufferType: "RISK",
        },
    ],
}