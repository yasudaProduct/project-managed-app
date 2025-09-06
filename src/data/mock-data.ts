const baseDate = new Date();
const addDays = (days: number): Date => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date;
};

interface MockData {
    project: {
        id: string;
        name: string;
        status: string;
        description: string;
        startDate: Date;
        endDate: Date;
    };
    wbs: {
        id: number;
        projectId: string;
        name: string;
        status: string;
    }[];
    wbsAssignee: {
        id: number;
        wbsId: number;
        assigneeId: string;
        rate: number;
    }[];
    wbsPhase: {
        id: number;
        wbsId: number;
        name: string;
        code: string;
        seq: number;
    }[];
    wbsTask: {
        id: number;
        taskNo: string;
        wbsId: number;
        phaseId: number;
        name: string;
        assigneeId: number;
        status: string;
        startDate: Date;
        endDate: Date;
        kosu: number;
    }[];
    wbsBuffer: {
        id: number;
        wbsId: number;
        name: string;
        buffer: number;
        bufferType: string;
    }[];
    workRecords: {
        id: number;
        userId: string;
        taskId: number;
        date: Date;
        hours_worked: number;
    }[];
    milestone: {
        id: number;
        wbsId: number;
        name: string;
        date: Date;
    }[];
    companyHolidays: {
        id: number;
        date: Date;
        name: string;
        type: string;
    }[];
    userSchedules: {
        id: number;
        userId: string;
        date: Date;
        title: string;
        startTime: string;
        endTime: string;
        location: string;
        description: string;
    }[];
};

export function getMockData(): MockData[] {

    const mockData: (projectId: string, wbsId: number, multiId: number) => MockData = (projectId: string, wbsId: number, multiId: number) => {
        const wbsAssigneeId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsTaskId = wbsId * multiId;
        const wbsBufferId = wbsId * multiId;
        const wbsMilestoneId = wbsId * multiId;

        return {
            project: {
                id: projectId,
                name: "新規機能開発案件",
                status: "ACTIVE",
                description: "テストプロジェクト",
                startDate: baseDate,
                endDate: addDays(90),
            },
            wbs: [
                {
                    id: wbsId,
                    projectId: projectId,
                    name: "新規機能開発A",
                    status: "ACTIVE",
                },
                {
                    id: wbsId + 1,
                    projectId: projectId,
                    name: "新規機能開発B",
                    status: "ACTIVE",
                },
            ],
            wbsAssignee: [
                {
                    id: wbsAssigneeId,
                    wbsId: wbsId,
                    assigneeId: "dummy01",
                    rate: 1.0,
                },
                {
                    id: wbsAssigneeId + 1,
                    wbsId: wbsId,
                    assigneeId: "dummy02",
                    rate: 0.8,
                },
                {
                    id: wbsAssigneeId + 2,
                    wbsId: wbsId,
                    assigneeId: "dummy03",
                    rate: 0.5,
                },
                {
                    id: wbsAssigneeId + 3,
                    wbsId: wbsId,
                    assigneeId: "dummy04",
                    rate: 1,
                },
            ],
            wbsPhase: [
                {
                    id: wbsPhaseId,
                    wbsId: wbsId,
                    name: "詳細設計",
                    code: "D2",
                    seq: 1,
                },
                {
                    id: wbsPhaseId + 1,
                    wbsId: wbsId + 1,
                    name: "開発",
                    code: "D3",
                    seq: 2,
                },
                {
                    id: wbsPhaseId + 2,
                    wbsId: wbsId,
                    name: "単体テスト",
                    code: "D4",
                    seq: 3,
                },
                {
                    id: wbsPhaseId + 3,
                    wbsId: wbsId,
                    name: "ユーザーテスト",
                    code: "D5",
                    seq: 4,
                },
            ],
            wbsTask: [
                {
                    id: wbsTaskId,
                    taskNo: "D2-0001",
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "機能A設計書",
                    assigneeId: wbsAssigneeId,
                    status: "NOT_STARTED",
                    startDate: baseDate,
                    endDate: addDays(5),
                    kosu: 15,
                },
                {
                    id: wbsTaskId + 1,
                    taskNo: "D2-0002",
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "機能B設計書",
                    assigneeId: wbsAssigneeId + 1,
                    status: "IN_PROGRESS",
                    startDate: baseDate,
                    endDate: addDays(5),
                    kosu: 15,
                },
                {
                    id: wbsTaskId + 2,
                    taskNo: "D2-0003",
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "機能C設計書",
                    assigneeId: wbsAssigneeId + 2,
                    status: "COMPLETED",
                    startDate: baseDate,
                    endDate: addDays(5),
                    kosu: 15,
                },
                {
                    id: wbsTaskId + 3,
                    taskNo: "D2-0004",
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "機能D設計書",
                    assigneeId: wbsAssigneeId + 3,
                    status: "ON_HOLD",
                    startDate: baseDate,
                    endDate: addDays(5),
                    kosu: 15,
                },
                // {
                //     id: wbsTaskId + 4,
                //     taskNo: "D3-0001",
                //     wbsId: wbsId,
                //     phaseId: wbsPhaseId + 1,
                //     name: "機能A開発",
                //     assigneeId: wbsAssigneeId,
                //     status: "NOT_STARTED",
                //     startDate: baseDate,
                //     endDate: addDays(5),
                //     kosu: 15,
                // },
                // {
                //     id: wbsTaskId + 4,
                //     taskNo: "D3-0002",
                //     wbsId: wbsId,
                //     phaseId: wbsPhaseId + 1,
                //     name: "機能B開発",
                //     assigneeId: wbsAssigneeId + 1,
                //     status: "NOT_STARTED",
                //     startDate: baseDate,
                //     endDate: addDays(5),
                //     kosu: 15,
                // },
                // {
                //     id: wbsTaskId + 5,
                //     taskNo: "D3-0003",
                //     wbsId: wbsId,
                //     phaseId: wbsPhaseId + 1,
                //     name: "機能C開発",
                //     assigneeId: wbsAssigneeId + 2,
                //     status: "IN_PROGRESS",
                //     startDate: baseDate,
                //     endDate: addDays(5),
                //     kosu: 15,
                // },
            ],
            wbsBuffer: [
                {
                    id: wbsBufferId,
                    wbsId: wbsId,
                    name: "リスク対策工数",
                    buffer: 50,
                    bufferType: "RISK",
                },
            ],
            workRecords: [],
            milestone: [
                {
                    id: wbsMilestoneId,
                    wbsId: wbsId,
                    name: "キックオフ",
                    date: addDays(0),
                },
            ],
            companyHolidays: [],
            userSchedules: [],
        }
    }

    return [
        mockData("test-project-1", 1, 10),
    ]
}

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
    companyHolidays: [],
    userSchedules: []
}

// ガント/月次集計の総合動作確認用データ
export const assigneeGanttMonthlyTestData = {
    project: {
        id: 60,
        name: "稼働表・月次集計テスト",
        status: "ACTIVE",
        description: "稼働表・月次集計テスト",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-10-30"),
    },
    wbs: [
        {
            id: 60,
            projectId: 60,
            name: "稼働表・月次集計テスト",
            status: "IN_PROGRESS",
        },
    ],
    wbsAssignee: [
        {
            id: 60,
            wbsId: 60,
            assigneeId: "dummy05",
            rate: 1.0,
        },
        {
            id: 61,
            wbsId: 60,
            assigneeId: "dummy06",
            rate: 0.8,
        },
        {
            id: 62,
            wbsId: 60,
            assigneeId: "dummy07",
            rate: 1.0,
        },
    ],
    wbsPhase: [
        {
            id: 60,
            wbsId: 60,
            name: "稼働表・月次集計テスト",
            code: "TEST",
            seq: 1,
        },
    ],
    // 月またぎ/同日複数タスク/会社休日/個人予定を含む
    wbsTask: [
        {
            id: 60,
            taskNo: "TEST-0001",
            wbsId: 60,
            phaseId: 60,
            name: "休日跨がないタスク",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-01"),
            endDate: new Date("2025-09-05"),
            kosu: 10,
        },
        {
            id: 61,
            taskNo: "TEST-0002",
            wbsId: 60,
            phaseId: 60,
            name: "休日を跨ぐタスク",
            assigneeId: 61, // dummy06
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-05"),
            endDate: new Date("2025-09-08"),
            kosu: 10,
        },
        {
            id: 62,
            taskNo: "TEST-0003",
            wbsId: 60,
            phaseId: 60,
            name: "重なってるタスクA",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-16"),
            endDate: new Date("2025-09-16"),
            kosu: 2,
        },
        {
            id: 63,
            taskNo: "TEST-0004",
            wbsId: 60,
            phaseId: 60,
            name: "重なってるタスクB",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-16"),
            endDate: new Date("2025-09-16"),
            kosu: 2,
        },
        {
            id: 64,
            taskNo: "TEST-0005",
            wbsId: 60,
            phaseId: 60,
            name: "重なってるタスクA1",
            assigneeId: 61, // dummy06
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-16"),
            endDate: new Date("2025-09-17"),
            kosu: 10,
        },
        {
            id: 65,
            taskNo: "TEST-0006",
            wbsId: 60,
            phaseId: 60,
            name: "重なってるタスクA2",
            assigneeId: 61,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-16"),
            endDate: new Date("2025-09-17"),
            kosu: 8,
        },
        {
            id: 66,
            taskNo: "TEST-0007",
            wbsId: 60,
            phaseId: 60,
            name: "会社休日と被る",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-09"),
            endDate: new Date("2025-09-10"),
            kosu: 7.5,
        },
        {
            id: 67,
            taskNo: "TEST-0008",
            wbsId: 60,
            phaseId: 60,
            name: "土日祝と被る",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-13"),
            endDate: new Date("2025-09-15"),
            kosu: 8,
        },
        {
            id: 68,
            taskNo: "TEST-0009",
            wbsId: 60,
            phaseId: 60,
            name: "会社休日をまたぐ",
            assigneeId: 61,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-10"),
            endDate: new Date("2025-09-11"),
            kosu: 7.5,
        },
        {
            id: 69,
            taskNo: "TEST-0010",
            wbsId: 60,
            phaseId: 60,
            name: "Scheduleと被る",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-18"),
            endDate: new Date("2025-09-18"),
            kosu: 8,
        },
        {
            id: 70,
            taskNo: "TEST-0011",
            wbsId: 60,
            phaseId: 60,
            name: "個人休暇をまたぐ",
            assigneeId: 61,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-18"),
            endDate: new Date("2025-09-19"),
            kosu: 8,
        },
        {
            id: 71,
            taskNo: "TEST-0012",
            wbsId: 60,
            phaseId: 60,
            name: "個人休暇、土日と被る",
            assigneeId: 60,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-19"),
            endDate: new Date("2025-09-19"),
            kosu: 8,
        },
        {
            id: 72,
            taskNo: "TEST-0013",
            wbsId: 60,
            phaseId: 60,
            name: "月をまたぐ",
            assigneeId: 62,
            status: "IN_PROGRESS",
            startDate: new Date("2025-09-30"),
            endDate: new Date("2025-10-01"),
            kosu: 8,
        },
    ],
    wbsBuffer: [
        {
            id: 60,
            wbsId: 60,
            name: "E2E用バッファ",
            buffer: 10,
            bufferType: "RISK",
        },
    ],
    workRecords: [
        {
            id: 60,
            userId: "dummy05",
            taskId: 60,
            date: addDays(0),
            hours_worked: 6.0,
        },
    ],
    milestone: [
        {
            id: 60,
            wbsId: 60,
            name: "検証開始",
            date: new Date("2025-04-25"),
        },
        {
            id: 61,
            wbsId: 60,
            name: "検証完了",
            date: new Date("2025-05-10"),
        },
    ],
    // 会社休日（GW付近を想定）
    companyHolidays: [
        {
            id: 60,
            date: new Date("2025-09-09"),
            name: "会社特別休暇",
            type: "COMPANY",
        },
        {
            id: 61,
            date: addDays(31),
            name: "会社特別休暇",
            type: "COMPANY",
        },
        {
            id: 62,
            date: addDays(32),
            name: "会社特別休暇",
            type: "COMPANY",
        },
    ],
    // 個人予定（半休/全休/会議）
    userSchedules: [
        {
            id: 60,
            userId: "dummy05",
            date: new Date("2025-09-18"),
            title: "午前半休",
            startTime: "09:00",
            endTime: "12:00",
            location: "私用",
            description: "午前半休",
        },
        {
            id: 61,
            userId: "dummy06",
            date: new Date("2025-09-18"),
            title: "休暇",
            startTime: "00:00",
            endTime: "00:00",
            location: "",
            description: "私用のため",
        },
        {
            id: 62,
            userId: "dummy05",
            date: new Date("2025-09-19"),
            title: "有給休暇",
            startTime: "00:00",
            endTime: "00:00",
            location: "",
            description: "私用のため",
        },
    ],
};