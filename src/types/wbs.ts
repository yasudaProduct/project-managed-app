export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export type WbsPhase = {
    id: number
    wbsId: number
    seq: number
    name: string
    tasks: WbsTask[]
    createdAt: string
    updatedAt: string
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
    kijunStartDate: string | null
    kijunEndDate: string | null
    kijunKosu: number | null
    yoteiStartDate: string | null
    yoteiEndDate: string | null
    yoteiKosu: number | null
    jissekiStartDate: string | null
    jissekiEndDate: string | null
    jissekiKosu: number | null
    status: TaskStatus
    createdAt: string
    updatedAt: string
}

export type Wbs = {
    id: number
    name: string
    projectId: string
}

