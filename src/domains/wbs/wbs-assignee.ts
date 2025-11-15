export class WbsAssignee {
    public readonly id?: number;
    public readonly wbsId: number;
    public readonly userId: string;
    private rate: number;
    private costPerHour: number;
    public readonly userName?: string;
    public readonly seq: number;

    private constructor(args: { id?: number; wbsId: number; userId: string; userName?: string; rate: number; costPerHour: number; seq: number }) {
        this.id = args.id;
        this.wbsId = args.wbsId;
        this.userId = args.userId;
        this.userName = args.userName;
        this.rate = args.rate;
        this.costPerHour = args.costPerHour;
        this.seq = args.seq;
    }

    public static create(args: { wbsId?: number; userId: string; rate: number; costPerHour?: number; seq?: number }): WbsAssignee {
        return new WbsAssignee({
            wbsId: args.wbsId ?? 0,
            userId: args.userId,
            rate: args.rate,
            costPerHour: args.costPerHour ?? 5000,
            seq: args.seq ?? 0
        });
    }

    public static createFromDb(args: { id: number; wbsId: number; userId: string; userName?: string; rate: number; costPerHour: number; seq: number }): WbsAssignee {
        return new WbsAssignee(args);
    }

    public isEqual(wbsAssignee: WbsAssignee) {
        return this.id === wbsAssignee.id;
    }

    public getRate(): number {
        return this.rate;
    }

    public updateRate(rate: number) {
        this.rate = rate;
    }

    public getCostPerHour(): number {
        return this.costPerHour;
    }

    public updateCostPerHour(costPerHour: number) {
        this.costPerHour = costPerHour;
    }

    /**
     * 未割当担当者を作成（ビジネスルール）
     * 担当者が割り当てられていないタスクの按分時に使用
     */
    public static createUnassigned(wbsId: number): WbsAssignee {
        return new WbsAssignee({
            wbsId,
            userId: 'unassigned',
            rate: 1,
            costPerHour: 5000,
            seq: 0
        });
    }
}