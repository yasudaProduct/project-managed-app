export interface ITaskRepository {
    findMaxSequenceNumber(wbsId: number, phaseCode: string): Promise<number>;
} 