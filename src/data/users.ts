export const users = {
    users: [
        {
            id: "dummy01",
            name: "安田 優太",
            email: "dummy01@example.com",
            displayName: "安田",
        },
        {
            id: "dummy02",
            name: "山田 太郎",
            email: "dummy02@example.com",
            displayName: "山田",
        },
        {
            id: "dummy03",
            name: "鈴木 花子",
            email: "dummy03@example.com",
            displayName: "鈴木",
        },
        {
            id: "dummy04",
            name: "佐藤 一郎",
            email: "dummy04@example.com",
            displayName: "佐藤",
        },
        {
            id: "dummy05",
            name: "田中 二郎",
            email: "dummy05@example.com",
            displayName: "田中",
        },
        {
            id: "dummy06",
            name: "松本 三郎",
            email: "dummy06@example.com",
            displayName: "松本",
        },
        {
            id: "dummy07",
            name: "山口 四郎",
            email: "dummy07@example.com",
            displayName: "山口",
        },
        {
            id: "dummy08",
            name: "小林 五郎",
            email: "dummy08@example.com",
            displayName: "小林",
        },
        {
            id: "dummy09",
            name: "山田 六郎",
            email: "dummy09@example.com",
            displayName: "山田",
        },
        {
            id: "dummy10",
            name: "山田 七郎",
            email: "dummy10@example.com",
            displayName: "山田",
        },
        {
            id: "dummy11",
            name: "山田 八郎",
            email: "dummy11@example.com",
            displayName: "山田",
        },
        {
            id: "dummy12",
            name: "山田 九郎",
            email: "dummy12@example.com",
            displayName: "山田",
        },
        {
            id: "dummy13",
            name: "山田 十郎",
            email: "dummy13@example.com",
            displayName: "山田",
        }
    ],
    userSchedules: [
        {
            id: 1,
            userId: "dummy01",
            date: new Date(),
            startTime: "10:00:00",
            endTime: "11:00:00",
            title: "会議",
            location: "会議室",
            description: "備考",
        },
        {
            id: 2,
            userId: "dummy01",
            date: new Date(),
            startTime: "13:00",
            endTime: "14:00",
            title: "問い合わせ",
            location: "テスト会議室",
            description: "テスト備考",
        },
        {
            id: 3,
            userId: "dummy01",
            date: new Date(new Date().setDate(new Date().getDate() + 1)),
            startTime: "15:00",
            endTime: "17:30",
            title: "会議",
            location: "会議室",
            description: "備考",
        }
    ],
};
