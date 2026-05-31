/** シードの基準日（3ヶ月期間の開始に合わせる） */
const baseDate = new Date("2026-01-01T00:00:00.000Z");
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
        assigneeId: number | undefined;
        status: string;
        startDate: Date;
        endDate: Date;
        kosu: number;
        progressRate?: number;
        jisseki?: {
            userId: string;
            jissekiKosu: number;
            date: Date;
        }[];
        kijun?: {
            startDate: Date;
            endDate: Date;
            kosu: number;
        }

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
        taskNo: string;
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
        const wbsBufferId = wbsId * multiId;
        const wbsMilestoneId = wbsId * multiId;

        const projectStart = new Date(baseDate);
        const projectEnd = addDays(89);

        return {
            project: {
                id: projectId,
                name: "新規機能開発案件",
                status: "ACTIVE",
                description: "テストプロジェクト（WBSタスクはMySQLからインポートする想定のため、PostgreSQLシードには登録しない）",
                startDate: projectStart,
                endDate: projectEnd,
            },
            wbs: [
                {
                    id: wbsId,
                    projectId: projectId,
                    name: "新規機能開発A",
                    status: "ACTIVE",
                },
            ],
            wbsAssignee: [
                { id: wbsAssigneeId, wbsId: wbsId, assigneeId: "dummy01", rate: 1.0 },
                { id: wbsAssigneeId + 1, wbsId: wbsId, assigneeId: "dummy02", rate: 1.0 },
                { id: wbsAssigneeId + 2, wbsId: wbsId, assigneeId: "dummy03", rate: 1.0 },
                { id: wbsAssigneeId + 3, wbsId: wbsId, assigneeId: "dummy04", rate: 1.0 },
                { id: wbsAssigneeId + 4, wbsId: wbsId, assigneeId: "dummy05", rate: 1.0 },
            ],
            wbsPhase: [
                { id: wbsPhaseId, wbsId: wbsId, name: "詳細設計", code: "D2", seq: 1 },
                { id: wbsPhaseId + 1, wbsId: wbsId, name: "製造", code: "D3", seq: 2 },
                { id: wbsPhaseId + 2, wbsId: wbsId, name: "単体テスト", code: "D4", seq: 3 },
                { id: wbsPhaseId + 3, wbsId: wbsId, name: "プロジェクト管理", code: "D9", seq: 4 },
            ],
            wbsTask: [],
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
                { id: wbsMilestoneId, wbsId: wbsId, name: "キックオフ", date: projectStart },
                { id: wbsMilestoneId + 1, wbsId: wbsId, name: "中間レビュー", date: addDays(44) },
                { id: wbsMilestoneId + 2, wbsId: wbsId, name: "期間終了", date: projectEnd },
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

    // インポート検証用
    const mockDataImportValidationError = (projectId: string, wbsId: number, multiId: number) => {
        const wbsTaskId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsAssigneeId = wbsId * multiId;
        return {
            project: {
                id: projectId,
                name: "インポート検証エラーあり",
                status: "ACTIVE",
                description: "インポート検証",
                startDate: addDays(0),
                endDate: addDays(3),
            },
            wbs: [{
                id: wbsId,
                projectId: projectId,
                name: "インポート検証エラーあり",
                status: "ACTIVE",
            }],
            wbsAssignee: [{
                id: wbsAssigneeId,
                wbsId: wbsId,
                assigneeId: "dummy01",
                rate: 1.0,
            }],
            wbsPhase: [{
                id: wbsPhaseId,
                wbsId: wbsId,
                name: "設計",
                code: "D1",
                seq: 1,
            }],
            wbsTask: [{
                id: wbsTaskId,
                taskNo: "D1-0002",
                wbsId: wbsId,
                phaseId: wbsPhaseId,
                name: "インポート検証(既存タスク)",
                status: "NOT_STARTED",
                assigneeId: wbsAssigneeId,
                startDate: addDays(0),
                endDate: addDays(3),
                kosu: 12,
            }],
            wbsBuffer: [],
            workRecords: [],
            milestone: [],
            companyHolidays: [],
            userSchedules: [],
        }
    }

    const mockDataImportValidation = (projectId: string, wbsId: number, multiId: number) => {
        const wbsTaskId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsAssigneeId = wbsId * multiId;
        return {
            project: {
                id: projectId,
                name: "インポート検証",
                status: "ACTIVE",
                description: "インポート検証",
                startDate: addDays(0),
                endDate: addDays(3),
            },
            wbs: [{
                id: wbsId,
                projectId: projectId,
                name: "インポート検証",
                status: "ACTIVE",
            }],
            wbsAssignee: [{
                id: wbsAssigneeId,
                wbsId: wbsId,
                assigneeId: "dummy01",
                rate: 1.0,
            }],
            wbsPhase: [{
                id: wbsPhaseId,
                wbsId: wbsId,
                name: "設計",
                code: "D1",
                seq: 1,
            }],
            wbsTask: [{
                id: wbsTaskId,
                taskNo: "D1-0002",
                wbsId: wbsId,
                phaseId: wbsPhaseId,
                name: "インポート検証(既存タスク)",
                status: "NOT_STARTED",
                assigneeId: wbsAssigneeId,
                startDate: addDays(0),
                endDate: addDays(3),
                kosu: 12,
            }],
            wbsBuffer: [],
            workRecords: [],
            milestone: [],
            companyHolidays: [],
            userSchedules: [],
        }
    }

    // 集計表検証（タスクはMySQLインポート前提のため未登録）
    const mockDataWbsSummary = (projectId: string, wbsId: number, multiId: number) => {
        const wbsAssigneeId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;

        const projectStart = new Date(baseDate);
        const projectEnd = addDays(89);

        return {
            project: {
                id: projectId,
                name: "集計表検証",
                status: "ACTIVE",
                description: "集計表検証（タスクはMySQLインポート後に利用）",
                startDate: projectStart,
                endDate: projectEnd,
            },
            wbs: [
                {
                    id: wbsId,
                    projectId: projectId,
                    name: "集計表検証WBS",
                    status: "ACTIVE",
                },
            ],
            wbsAssignee: [
                { id: wbsAssigneeId, wbsId: wbsId, assigneeId: "dummy01", rate: 1.0 },
                { id: wbsAssigneeId + 1, wbsId: wbsId, assigneeId: "dummy02", rate: 1.0 },
                { id: wbsAssigneeId + 2, wbsId: wbsId, assigneeId: "dummy03", rate: 1.0 },
                { id: wbsAssigneeId + 3, wbsId: wbsId, assigneeId: "dummy04", rate: 1.0 },
                { id: wbsAssigneeId + 4, wbsId: wbsId, assigneeId: "dummy05", rate: 1.0 },
            ],
            wbsPhase: [
                { id: wbsPhaseId, wbsId: wbsId, name: "詳細設計", code: "D2", seq: 1 },
                { id: wbsPhaseId + 1, wbsId: wbsId, name: "製造", code: "D3", seq: 2 },
                { id: wbsPhaseId + 2, wbsId: wbsId, name: "単体テスト", code: "D4", seq: 3 },
                { id: wbsPhaseId + 3, wbsId: wbsId, name: "プロジェクト管理", code: "D9", seq: 4 },
            ],
            wbsTask: [],
            wbsBuffer: [],
            workRecords: [],
            milestone: [],
            companyHolidays: [],
            userSchedules: [],
        }
    }

    // EVM予測拡張検証用データ
    // - SPI < 1（スケジュール遅延）で予測ポイントが endDate 以降に拡張されることを確認
    // - 今日: 2026-05-30, プロジェクト: 2026-04-01 ~ 2026-06-30
    // - BAC=300h, 現在EV≈160h, SPI≈0.73
    // - 予測ON時、06/30 以降に予測ポイントが1点追加され、EV≈218h でプラトーになる
    const mockDataEvmPrediction = (projectId: string, wbsId: number, multiId: number): MockData => {
        const wbsAssigneeId = wbsId * multiId;
        const wbsPhaseId = wbsId * multiId;
        const wbsBufferId = wbsId * multiId;
        const wbsMilestoneId = wbsId * multiId;

        const projectStart = new Date("2026-04-01T00:00:00.000Z");
        const projectEnd = new Date("2026-06-30T00:00:00.000Z");

        // 作業実績ID用オフセット（既存IDと衝突しないよう大きめの値）
        let workRecordIdSeq = wbsId * multiId;

        // 週次の作業実績を生成するヘルパー
        const generateWeeklyRecords = (
            userId: string,
            taskNo: string,
            startDate: Date,
            weeks: number,
            hoursPerWeek: number
        ) => {
            const records = [];
            for (let w = 0; w < weeks; w++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + w * 7);
                records.push({
                    id: ++workRecordIdSeq,
                    userId,
                    taskNo,
                    date: d,
                    hours_worked: hoursPerWeek,
                });
            }
            return records;
        };

        return {
            project: {
                id: projectId,
                name: "EVM予測拡張検証",
                status: "ACTIVE",
                description: "SPI<1の状態で予測EV/ACがBAC到達まで延伸されることを確認するテストデータ",
                startDate: projectStart,
                endDate: projectEnd,
            },
            wbs: [{
                id: wbsId,
                projectId,
                name: "EVM予測検証WBS",
                status: "ACTIVE",
            }],
            wbsAssignee: [
                { id: wbsAssigneeId, wbsId, assigneeId: "dummy01", rate: 1.0 },
                { id: wbsAssigneeId + 1, wbsId, assigneeId: "dummy02", rate: 1.0 },
            ],
            wbsPhase: [
                { id: wbsPhaseId, wbsId, name: "詳細設計", code: "D2", seq: 1 },
                { id: wbsPhaseId + 1, wbsId, name: "製造", code: "D3", seq: 2 },
                { id: wbsPhaseId + 2, wbsId, name: "テスト", code: "D4", seq: 3 },
            ],
            wbsTask: [
                // T1: 設計（完了済み）100h
                {
                    id: wbsId * multiId,
                    taskNo: "D2-0001",
                    wbsId,
                    phaseId: wbsPhaseId,
                    name: "画面設計",
                    assigneeId: wbsAssigneeId,
                    status: "COMPLETED",
                    startDate: new Date("2026-04-01T00:00:00.000Z"),
                    endDate: new Date("2026-04-30T00:00:00.000Z"),
                    kosu: 100,
                    progressRate: 100,
                },
                // T2: 製造（進行中・遅延）120h / 進捗50%
                {
                    id: wbsId * multiId + 1,
                    taskNo: "D3-0001",
                    wbsId,
                    phaseId: wbsPhaseId + 1,
                    name: "バックエンド実装",
                    assigneeId: wbsAssigneeId,
                    status: "IN_PROGRESS",
                    startDate: new Date("2026-05-01T00:00:00.000Z"),
                    endDate: new Date("2026-05-31T00:00:00.000Z"),
                    kosu: 120,
                    progressRate: 50,
                },
                // T3: テスト（未着手）80h
                {
                    id: wbsId * multiId + 2,
                    taskNo: "D4-0001",
                    wbsId,
                    phaseId: wbsPhaseId + 2,
                    name: "結合テスト",
                    assigneeId: wbsAssigneeId + 1,
                    status: "NOT_STARTED",
                    startDate: new Date("2026-06-01T00:00:00.000Z"),
                    endDate: new Date("2026-06-30T00:00:00.000Z"),
                    kosu: 80,
                    progressRate: 0,
                },
            ],
            wbsBuffer: [{
                id: wbsBufferId,
                wbsId,
                name: "リスクバッファ",
                buffer: 0,
                bufferType: "RISK",
            }],
            workRecords: [
                // T1（設計）: 4月に4週×25h = 100h → 完了
                ...generateWeeklyRecords("dummy01", "D2-0001", new Date("2026-04-06T00:00:00.000Z"), 4, 25),
                // T2（製造）: 5月に4週×20h = 80h （進捗50%だがコスト超過）
                ...generateWeeklyRecords("dummy01", "D3-0001", new Date("2026-05-04T00:00:00.000Z"), 4, 20),
            ],
            milestone: [
                { id: wbsMilestoneId, wbsId, name: "設計完了", date: new Date("2026-04-30T00:00:00.000Z") },
                { id: wbsMilestoneId + 1, wbsId, name: "製造完了", date: new Date("2026-05-31T00:00:00.000Z") },
                { id: wbsMilestoneId + 2, wbsId, name: "テスト完了", date: new Date("2026-06-30T00:00:00.000Z") },
            ],
            companyHolidays: [],
            userSchedules: [],
        };
    };

    return [
        mockData("test-project-1", 1, 10),
        // mockDataLarge("test-project-2", 2, 1000),
        // mockDataAssigneeGanttMonthlyTest("test-project-3", 3, 100),
        // mockDataImportValidationError("test-project-4", 4, 100),
        // mockDataImportValidation("test-project-5", 5, 100),
        mockDataWbsSummary("test-project-6", 6, 100),
        mockDataEvmPrediction("evm-prediction-test", 7, 1000),
    ]
}
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