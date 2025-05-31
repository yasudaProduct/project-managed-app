export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export type ProjectStatus = "INACTIVE" | "ACTIVE" | "DONE" | "CANCELLED" | "PENDING"

export type PeriodType = "KIJUN" | "YOTEI" | "JISSEKI"

export type KosuType = "NORMAL" | "RISK"

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
    id: number
    taskNo?: string;
    name: string;
    status: TaskStatus;
    assigneeId?: string;
    assignee?: {
        id: string;
        name: string;
        displayName: string;
    };
    phaseId?: number;
    phase?: {
        id: number;
        name: string;
        seq: number;
    };
    kijunStart?: Date
    kijunEnd?: Date
    kijunKosu?: number
    yoteiStart?: Date
    yoteiEnd?: Date
    yoteiKosu?: number
    jissekiStart?: Date
    jissekiEnd?: Date
    jissekiKosu?: number
    createdAt?: Date
    updatedAt?: Date
}

export type TaskPeriod = {
    id?: number
    taskId?: string
    startDate: Date
    endDate: Date
    type: PeriodType
    kosus: TaskKosu[]
}

export type TaskKosu = {
    id?: number
    periodId?: number
    kosu: number
    type: KosuType
}

export type Wbs = {
    id: number
    name: string
    projectId: string
}

export type Milestone = {
    id: number
    name: string
    date: Date
}

export type Assignee = {
    id: number
    userId: string
    name: string
    displayName: string
    rate: number
}