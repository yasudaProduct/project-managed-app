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