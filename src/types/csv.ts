export type taskCsvData = {
    name: string;
    userId: string;
    phaseId: string;
    kosu: number;
}

export type scheduleCsvData = {
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    title: string;
    location: string;
    description: string;
}

// New TSV format for userSchedule.txt
export type scheduleTsvData = {
    '個人ｺｰﾄﾞ': string;     // Personal Code (User ID)
    '氏名': string;         // Name
    '登録区分': string;     // Registration Type (usually empty)
    '年月日': string;       // Date (YYYY/MM/DD HH:mm:ss format)
    '開始時間': string;     // Start Time (HH:mm format)
    '終了時間': string;     // End Time (HH:mm format)
    'ﾀｲﾄﾙ': string;        // Title
    '場所': string;         // Location
    '内容': string;         // Content/Description
}