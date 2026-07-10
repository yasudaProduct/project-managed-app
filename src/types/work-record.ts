export type WorkRecordDetail = {
    id: number
    userId: string
    userName: string
    taskId: number | null
    taskNo: string | null
    taskName: string | null
    date: Date
    hoursWorked: number
}
