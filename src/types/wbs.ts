export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export type ProjectStatus = "INACTIVE" | "ACTIVE" | "DONE" | "CANCELLED" | "PENDING"

export type WbsPhase = {
    id: number
    wbsId: number
    seq: number
    name: string
    tasks?: WbsTask[]
    createdAt: Date
    updatedAt: Date
}

export type WbsTask = {
    id: string
    wbsId: number
    phaseId: number | null
    name: string
    assigneeId: string | null
    assignee?: {
        id: string
        name: string
    }
    kijunStartDate: Date | null
    kijunEndDate: Date | null
    kijunKosu: number | null
    yoteiStartDate: Date | null
    yoteiEndDate: Date | null
    yoteiKosu: number | null
    jissekiStartDate: Date | null
    jissekiEndDate: Date | null
    jissekiKosu: number | null
    status: TaskStatus
    createdAt: Date
    updatedAt: Date
}

export type Wbs = {
    id: number
    name: string
    projectId: string
}

