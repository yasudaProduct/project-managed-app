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

    // 大量データ
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mockDataLarge = (projectId: string, wbsId: number, multiId: number) => {
        const wbsAssigneeId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsTaskId = wbsId * multiId;
        const wbsBufferId = wbsId * multiId;
        const wbsMilestoneId = wbsId * multiId;

        return {
            project: {
                id: projectId,
                name: "大規模開発プロジェクト",
                status: "ACTIVE",
                description: "大規模開発プロジェクト",
                startDate: baseDate,
                endDate: addDays(120),
            },
            wbs: [
                {
                    id: wbsId,
                    projectId: projectId,
                    name: "機能開発A",
                    status: "ACTIVE",
                },
                {
                    id: wbsId + 1,
                    projectId: projectId,
                    name: "機能開発B",
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
                    wbsId: wbsId + 1,
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
                {
                    id: wbsAssigneeId + 4,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy05",
                    rate: 1,
                },
                {
                    id: wbsAssigneeId + 5,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy06",
                    rate: 1,
                },
                {
                    id: wbsAssigneeId + 6,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy07",
                    rate: 1,
                },
                {
                    id: wbsAssigneeId + 7,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy08",
                    rate: 1,
                },
                {
                    id: wbsAssigneeId + 8,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy09",
                    rate: 1,
                },
                {
                    id: wbsAssigneeId + 9,
                    wbsId: wbsId + 1,
                    assigneeId: "dummy10",
                    rate: 1,
                },
            ],
            wbsPhase: [
                {
                    id: wbsPhaseId,
                    wbsId: wbsId,
                    name: "基本設計",
                    code: "D1",
                    seq: 1,
                },
                {
                    id: wbsPhaseId + 1,
                    wbsId: wbsId,
                    name: "詳細設計",
                    code: "D2",
                    seq: 2,
                },
                {
                    id: wbsPhaseId + 2,
                    wbsId: wbsId,
                    name: "開発",
                    code: "D3",
                    seq: 3,
                },
                {
                    id: wbsPhaseId + 3,
                    wbsId: wbsId,
                    name: "単体テスト",
                    code: "D4",
                    seq: 4,
                },
                {
                    id: wbsPhaseId + 4,
                    wbsId: wbsId,
                    name: "結合テスト",
                    code: "D5",
                    seq: 5,
                },
                {
                    id: wbsPhaseId + 5,
                    wbsId: wbsId,
                    name: "システムテスト",
                    code: "D6",
                    seq: 6,
                },
                {
                    id: wbsPhaseId + 6,
                    wbsId: wbsId,
                    name: "ユーザーテスト",
                    code: "D7",
                    seq: 7,
                },
                {
                    id: wbsPhaseId + 7,
                    wbsId: wbsId,
                    name: "本番導入",
                    code: "D8",
                    seq: 8,
                },
                {
                    id: wbsPhaseId + 8,
                    wbsId: wbsId,
                    name: "プロジェクト管理",
                    code: "D9",
                    seq: 9,
                },
            ],
            wbsTask: [
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i,
                    taskNo: `D1-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D1-0001~D1-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 100,
                    taskNo: `D2-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D2-0001~D2-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 1,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 200,
                    taskNo: `D3-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D3-0001~D3-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 2,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 300,
                    taskNo: `D4-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D4-0001~D4-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 3,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 400,
                    taskNo: `D5-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D5-0001~D5-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 4,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 500,
                    taskNo: `D6-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D6-0001~D6-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 5,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 600,
                    taskNo: `D7-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D7-0001~D7-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 6,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 100 }, (_, i) => ({
                    id: wbsTaskId + i + 700,
                    taskNo: `D8-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D8-0001~D8-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 7,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
                ...Array.from({ length: 10 }, (_, i) => ({
                    id: wbsTaskId + i + 800,
                    taskNo: `D9-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D9-0001~D9-00100）
                    wbsId: wbsId,
                    phaseId: wbsPhaseId + 8,
                    name: `機能${i + 1}`,
                    assigneeId: Math.floor(Math.random() * 10) + wbsAssigneeId,
                    status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
                    startDate: addDays(i),
                    endDate: addDays(i + 5),
                    kosu: Math.floor(Math.random() * 10) + 10,
                })),
            ],
            wbsBuffer: [
                {
                    id: wbsBufferId,
                    wbsId: wbsId,
                    name: "リスク対策工数",
                    buffer: 100,
                    bufferType: "RISK",
                },
            ],
            milestone: [
                {
                    id: wbsMilestoneId,
                    wbsId: wbsId,
                    name: "マイルストーン1",
                    date: addDays(100),
                },
                {
                    id: wbsMilestoneId + 1,
                    wbsId: wbsId,
                    name: "マイルストーン2",
                    date: addDays(200),
                },
            ],
            workRecords: [
                // ...Array.from({ length: 10 }, (_, i) => ({
                //     id: wbsWorkRecordId + i,
                //     userId: `dummy${String(Math.floor(Math.random() * 13) + 1).padStart(2, '0')}`,
                //     taskId: wbsTaskId + i,
                //     date: addDays(i),
                //     hours_worked: 8,
                // })),
            ],
            companyHolidays: [],
            userSchedules: [],
        }
    }

    // 稼働表検証
    const mockDataAssigneeGanttMonthlyTest = (projectId: string, wbsId: number, multiId: number) => {
        const wbsAssigneeId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsTaskId = wbsId * multiId;
        const companyHolidaysId = wbsId * multiId;
        const userSchedulesId = wbsId * multiId;

        return {
            project: {
                id: projectId,
                name: "稼働表検証",
                status: "ACTIVE",
                description: "稼働表検証",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2025-11-30"),
            },
            wbs: [
                {
                    id: wbsId,
                    projectId: projectId,
                    name: "稼働表検証",
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
            ],
            wbsPhase: [
                {
                    id: wbsPhaseId,
                    wbsId: wbsId,
                    name: "稼働表検証",
                    code: "TEST",
                    seq: 1,
                },
            ],
            wbsTask: [
                {
                    id: wbsTaskId,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "稼働表検証",
                    status: "NOT_STARTED",
                    taskNo: "D1-0001",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-01"),
                    endDate: new Date("2025-09-02"),
                    kosu: 10,
                },
                {
                    id: wbsTaskId + 1,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "土曜日を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0002",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-05"),
                    endDate: new Date("2025-09-06"),
                    kosu: 10,
                },
                {
                    id: wbsTaskId + 2,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "日曜日を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0003",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-07"),
                    endDate: new Date("2025-09-08"),
                    kosu: 10,
                },
                {
                    id: wbsTaskId + 3,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "土日祝を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0004",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-12"),
                    endDate: new Date("2025-09-16"),
                    kosu: 10,
                },
                {
                    id: wbsTaskId + 4,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "土日祝と被る",
                    status: "NOT_STARTED",
                    taskNo: "D1-0005",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-13"),
                    endDate: new Date("2025-09-15"),
                    kosu: 10,
                },
                {
                    id: wbsTaskId + 5,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "個人予定と被る1",
                    status: "NOT_STARTED",
                    taskNo: "D1-0006",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-09"),
                    endDate: new Date("2025-09-09"),
                    kosu: 7.5,
                },
                {
                    id: wbsTaskId + 6,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "個人予定と被る2",
                    status: "NOT_STARTED",
                    taskNo: "D1-0007",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-09"),
                    endDate: new Date("2025-09-09"),
                    kosu: 7.5,
                },
                {
                    id: wbsTaskId + 7,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "個人休暇と被る",
                    status: "NOT_STARTED",
                    taskNo: "D1-0008",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-10"),
                    endDate: new Date("2025-09-10"),
                    kosu: 7.5,
                },
                {
                    id: wbsTaskId + 8,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "個人休暇を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0009",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-10"),
                    endDate: new Date("2025-09-11"),
                    kosu: 7.5,
                },
                {
                    id: wbsTaskId + 9,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "休暇、土日とかぶる",
                    status: "NOT_STARTED",
                    taskNo: "D1-0010",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-19"),
                    endDate: new Date("2025-09-21"),
                    kosu: 7.5,
                },
                {
                    id: wbsTaskId + 10,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "休暇、土日を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0011",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-19"),
                    endDate: new Date("2025-09-22"),
                    kosu: 3,

                },
                {
                    id: wbsTaskId + 11,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "会社休日と被る",
                    status: "NOT_STARTED",
                    taskNo: "D1-0012",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-17"),
                    endDate: new Date("2025-09-17"),
                    kosu: 3,
                },
                {
                    id: wbsTaskId + 12,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "会社休日を跨ぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0013",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-17"),
                    endDate: new Date("2025-09-18"),
                    kosu: 3,
                },
                {
                    id: wbsTaskId + 13,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "月をまたぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0014",
                    assigneeId: wbsAssigneeId,
                    startDate: new Date("2025-09-30"),
                    endDate: new Date("2025-10-01"),
                    kosu: 4,
                },
                {
                    id: wbsTaskId + 14,
                    wbsId: wbsId,
                    phaseId: wbsPhaseId,
                    name: "月をまたぐ",
                    status: "NOT_STARTED",
                    taskNo: "D1-0015",
                    assigneeId: wbsAssigneeId + 1,
                    startDate: new Date("2025-09-26"),
                    endDate: new Date("2025-10-01"),
                    kosu: 12,
                },
            ],
            wbsBuffer: [],
            workRecords: [],
            milestone: [],
            companyHolidays: [
                {
                    id: companyHolidaysId,
                    date: new Date("2025-09-17"),
                    name: "休暇",
                    type: "NATIONAL",
                },
                {
                    id: companyHolidaysId + 1,
                    date: new Date("2025-09-29"),
                    name: "休暇",
                    type: "NATIONAL",
                },
            ],
            userSchedules: [
                {
                    id: userSchedulesId,
                    userId: "dummy01",
                    date: new Date("2025-09-09"),
                    title: "打合せ",
                    startTime: "09:00",
                    endTime: "10:00",
                    location: "東京",
                    description: "打合せ",
                },
                {
                    id: userSchedulesId + 1,
                    userId: "dummy02",
                    date: new Date("2025-09-09"),
                    title: "打合せ",
                    startTime: "08:00",
                    endTime: "9:00",
                    location: "東京",
                    description: "打合せ",
                },
                {
                    id: userSchedulesId + 2,
                    userId: "dummy01",
                    date: new Date("2025-09-10"),
                    title: "休暇",
                    startTime: "00:00",
                    endTime: "00:00",
                    location: "",
                    description: "休暇",
                },
                {
                    id: userSchedulesId + 3,
                    userId: "dummy02",
                    date: new Date("2025-09-10"),
                    title: "有給休暇",
                    startTime: "00:00",
                    endTime: "00:00",
                    location: "",
                    description: "休暇",
                },
                {
                    id: userSchedulesId + 4,
                    userId: "dummy01",
                    date: new Date("2025-09-19"),
                    title: "休暇",
                    startTime: "00:00",
                    endTime: "00:00",
                    location: "",
                    description: "休暇",
                },
                {
                    id: userSchedulesId + 5,
                    userId: "dummy02",
                    date: new Date("2025-09-19"),
                    title: "休暇",
                    startTime: "00:00",
                    endTime: "00:00",
                    location: "",
                    description: "休暇",
                },
            ],
        }
    }

    return [
        mockData("test-project-1", 1, 10),
        // mockDataLarge("test-project-2", 2, 1000),
        mockDataAssigneeGanttMonthlyTest("test-project-3", 3, 100),
    ]
}

// 大量データ
// export const mockDataLarge = {
//     project: {
//         id: 2,
//         name: "大規模開発プロジェクト",
//         status: "ACTIVE",
//         description: "大規模開発プロジェクト",
//         startDate: baseDate,
//         endDate: addDays(120),
//     },
//     wbs: [{
//         id: 2,
//         projectId: 2,
//         name: "タスク01",
//         status: "NOT_STARTED",
//     }],
//     wbsAssignee: Array.from({ length: 10 }, (_, i) => ({
//         id: i + 1,
//         wbsId: 2,
//         assigneeId: `dummy${String(Math.floor(Math.random() * 13) + 1).padStart(2, '0')}`, // 01~13のユーザーからランダムに選択（末尾2桁は0埋め）
//     })),
//     wbsPhase: [{
//         id: 1,
//         wbsId: 2,
//         name: "詳細設計",
//         code: "D2",
//         seq: 1,
//     },
//     {
//         id: 2,
//         wbsId: 2,
//         name: "開発",
//         code: "D3",
//         seq: 2,
//     },
//     {
//         id: 3,
//         wbsId: 2,
//         name: "単体テスト",
//         code: "D4",
//         seq: 3,
//     },
//     {
//         id: 4,
//         wbsId: 2,
//         name: "ユーザーテスト",
//         code: "D5",
//         seq: 4,
//     },
//     ],
//     wbsTask: Array.from({ length: 200 }, (_, i) => ({
//         id: i + 1,
//         taskNo: `D2-${String(i + 1).padStart(4, '0')}`, // タスク番号　末尾0埋め４けた（D2-0001~D2-000100）
//         wbsId: 2,
//         phaseId: Math.floor(Math.random() * 4) + 1,
//         name: `機能${i + 1}`,
//         assigneeId: Math.floor(Math.random() * 10) + 1,
//         status: Math.random() < 0.5 ? "NOT_STARTED" : "IN_PROGRESS",
//         startDate: addDays(i),
//         endDate: addDays(i + 5),
//         kosu: Math.floor(Math.random() * 10) + 10,
//     })),
//     wbsBuffer: [{
//         id: 1,
//         wbsId: 1,
//         name: "リスク対策工数",
//         buffer: 50,
//         bufferType: "RISK",
//     }],
//     workRecords: Array.from({ length: 1000 }, (_, i) => ({
//         id: i + 1,
//         userId: `dummy${String(Math.floor(Math.random() * 13) + 1).padStart(2, '0')}`,
//         taskId: Math.floor(Math.random() * 100) + 1,
//         date: addDays(i),
//         hours_worked: 8,
//     })),
//     milestone: Array.from({ length: 100 }, (_, i) => ({
//         id: i + 1,
//         wbsId: 1,
//         name: `マイルストーン${i + 1} `,
//         date: addDays(i),
//     })),
//     companyHolidays: [],
//     userSchedules: []
// }

// ガント/月次集計の総合動作確認用データ
// export const assigneeGanttMonthlyTestData = {
//     project: {
//         id: 60,
//         name: "稼働表・月次集計テスト",
//         status: "ACTIVE",
//         description: "稼働表・月次集計テスト",
//         startDate: new Date("2025-09-01"),
//         endDate: new Date("2025-10-30"),
//     },
//     wbs: [
//         {
//             id: 60,
//             projectId: 60,
//             name: "稼働表・月次集計テスト",
//             status: "IN_PROGRESS",
//         },
//     ],
//     wbsAssignee: [
//         {
//             id: 60,
//             wbsId: 60,
//             assigneeId: "dummy05",
//             rate: 1.0,
//         },
//         {
//             id: 61,
//             wbsId: 60,
//             assigneeId: "dummy06",
//             rate: 0.8,
//         },
//         {
//             id: 62,
//             wbsId: 60,
//             assigneeId: "dummy07",
//             rate: 1.0,
//         },
//     ],
//     wbsPhase: [
//         {
//             id: 60,
//             wbsId: 60,
//             name: "稼働表・月次集計テスト",
//             code: "TEST",
//             seq: 1,
//         },
//     ],
//     // 月またぎ/同日複数タスク/会社休日/個人予定を含む
//     wbsTask: [
//         {
//             id: 60,
//             taskNo: "TEST-0001",
//             wbsId: 60,
//             phaseId: 60,
//             name: "休日跨がないタスク",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-01"),
//             endDate: new Date("2025-09-05"),
//             kosu: 10,
//         },
//         {
//             id: 61,
//             taskNo: "TEST-0002",
//             wbsId: 60,
//             phaseId: 60,
//             name: "休日を跨ぐタスク",
//             assigneeId: 61, // dummy06
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-05"),
//             endDate: new Date("2025-09-08"),
//             kosu: 10,
//         },
//         {
//             id: 62,
//             taskNo: "TEST-0003",
//             wbsId: 60,
//             phaseId: 60,
//             name: "重なってるタスクA",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-16"),
//             endDate: new Date("2025-09-16"),
//             kosu: 2,
//         },
//         {
//             id: 63,
//             taskNo: "TEST-0004",
//             wbsId: 60,
//             phaseId: 60,
//             name: "重なってるタスクB",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-16"),
//             endDate: new Date("2025-09-16"),
//             kosu: 2,
//         },
//         {
//             id: 64,
//             taskNo: "TEST-0005",
//             wbsId: 60,
//             phaseId: 60,
//             name: "重なってるタスクA1",
//             assigneeId: 61, // dummy06
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-16"),
//             endDate: new Date("2025-09-17"),
//             kosu: 10,
//         },
//         {
//             id: 65,
//             taskNo: "TEST-0006",
//             wbsId: 60,
//             phaseId: 60,
//             name: "重なってるタスクA2",
//             assigneeId: 61,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-16"),
//             endDate: new Date("2025-09-17"),
//             kosu: 8,
//         },
//         {
//             id: 66,
//             taskNo: "TEST-0007",
//             wbsId: 60,
//             phaseId: 60,
//             name: "会社休日と被る",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-09"),
//             endDate: new Date("2025-09-10"),
//             kosu: 7.5,
//         },
//         {
//             id: 67,
//             taskNo: "TEST-0008",
//             wbsId: 60,
//             phaseId: 60,
//             name: "土日祝と被る",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-13"),
//             endDate: new Date("2025-09-15"),
//             kosu: 8,
//         },
//         {
//             id: 68,
//             taskNo: "TEST-0009",
//             wbsId: 60,
//             phaseId: 60,
//             name: "会社休日をまたぐ",
//             assigneeId: 61,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-10"),
//             endDate: new Date("2025-09-11"),
//             kosu: 7.5,
//         },
//         {
//             id: 69,
//             taskNo: "TEST-0010",
//             wbsId: 60,
//             phaseId: 60,
//             name: "Scheduleと被る",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-18"),
//             endDate: new Date("2025-09-18"),
//             kosu: 8,
//         },
//         {
//             id: 70,
//             taskNo: "TEST-0011",
//             wbsId: 60,
//             phaseId: 60,
//             name: "個人休暇をまたぐ",
//             assigneeId: 61,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-18"),
//             endDate: new Date("2025-09-19"),
//             kosu: 8,
//         },
//         {
//             id: 71,
//             taskNo: "TEST-0012",
//             wbsId: 60,
//             phaseId: 60,
//             name: "個人休暇、土日と被る",
//             assigneeId: 60,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-19"),
//             endDate: new Date("2025-09-19"),
//             kosu: 8,
//         },
//         {
//             id: 72,
//             taskNo: "TEST-0013",
//             wbsId: 60,
//             phaseId: 60,
//             name: "月をまたぐ",
//             assigneeId: 62,
//             status: "IN_PROGRESS",
//             startDate: new Date("2025-09-30"),
//             endDate: new Date("2025-10-01"),
//             kosu: 8,
//         },
//     ],
//     wbsBuffer: [
//         {
//             id: 60,
//             wbsId: 60,
//             name: "E2E用バッファ",
//             buffer: 10,
//             bufferType: "RISK",
//         },
//     ],
//     workRecords: [
//         {
//             id: 60,
//             userId: "dummy05",
//             taskId: 60,
//             date: addDays(0),
//             hours_worked: 6.0,
//         },
//     ],
//     milestone: [
//         {
//             id: 60,
//             wbsId: 60,
//             name: "検証開始",
//             date: new Date("2025-04-25"),
//         },
//         {
//             id: 61,
//             wbsId: 60,
//             name: "検証完了",
//             date: new Date("2025-05-10"),
//         },
//     ],
//     // 会社休日（GW付近を想定）
//     companyHolidays: [
//         {
//             id: 60,
//             date: new Date("2025-09-09"),
//             name: "会社特別休暇",
//             type: "COMPANY",
//         },
//         {
//             id: 61,
//             date: addDays(31),
//             name: "会社特別休暇",
//             type: "COMPANY",
//         },
//         {
//             id: 62,
//             date: addDays(32),
//             name: "会社特別休暇",
//             type: "COMPANY",
//         },
//     ],
//     // 個人予定（半休/全休/会議）
//     userSchedules: [
//         {
//             id: 60,
//             userId: "dummy05",
//             date: new Date("2025-09-18"),
//             title: "午前半休",
//             startTime: "09:00",
//             endTime: "12:00",
//             location: "私用",
//             description: "午前半休",
//         },
//         {
//             id: 61,
//             userId: "dummy06",
//             date: new Date("2025-09-18"),
//             title: "休暇",
//             startTime: "00:00",
//             endTime: "00:00",
//             location: "",
//             description: "私用のため",
//         },
//         {
//             id: 62,
//             userId: "dummy05",
//             date: new Date("2025-09-19"),
//             title: "有給休暇",
//             startTime: "00:00",
//             endTime: "00:00",
//             location: "",
//             description: "私用のため",
//         },
//     ],
// };