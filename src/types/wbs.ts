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
    id: string;
    name: string;
    kijunStartDate: string;
    kijunEndDate: string;
    kijunKosu: number;
    yoteiStartDate: string;
    yoteiEndDate: string;
    yoteiKosu: number;
    jissekiStartDate: string;
    jissekiEndDate: string;
    jissekiKosu: number;
    status: TaskStatus;
    assigneeId: string;
    assignee?: {
        id: string;
        name: string;
        displayName: string;
    };
    phaseId: number;
    phase?: {
        id: number;
        name: string;
        seq: number;
    };
    createdAt: Date
    updatedAt: Date
}

export type Wbs = {
    id: number
    name: string
    projectId: string
}

