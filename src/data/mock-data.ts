export const mockData = {
    project: {
        id: 1,
        name: "新規機能開発",
        status: "ACTIVE",
        description: "テストプロジェクト",
    },
    wbs: [
        {
            id: 1,
            projectId: 1,
            name: "タスク01",
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
    ],
    wbsPhase: [
        {
            id: 1,
            wbsId: 1,
            name: "詳細設計",
            seq: 1,
        },
        {
            id: 2,
            wbsId: 1,
            name: "開発",
            seq: 2,
        },
        {
            id: 3,
            wbsId: 1,
            name: "単体テスト",
            seq: 3,
        },
        {
            id: 4,
            wbsId: 1,
            name: "ユーザーテスト",
            seq: 4,
        },
    ],
    wbsTask: [
        {
            id: 1,
            wbsId: 1,
            phaseId: 1,
            name: "機能A設計書",
            status: "NOT_STARTED",
        },
        {
            id: 2,
            wbsId: 1,
            phaseId: 1,
            name: "機能B設計書",
            status: "NOT_STARTED",
        },
        {
            id: 3,
            wbsId: 1,
            phaseId: 1,
            name: "機能C設計書",
            status: "NOT_STARTED",
        },
    ],
};
