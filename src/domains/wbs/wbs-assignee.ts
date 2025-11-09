export class WbsAssignee {
    public readonly id?: number;
    public readonly wbsId: number;
    public readonly userId: string;
    private rate: number;
    public readonly userName?: string;
    public readonly seq: number;

    private constructor(args: { id?: number; wbsId: number; userId: string; userName?: string; rate: number; seq: number }) {
        this.id = args.id;
        this.wbsId = args.wbsId;
        this.userId = args.userId;
        this.userName = args.userName;
        this.rate = args.rate;
        this.seq = args.seq;
    }

    public static create(args: { wbsId: number; userId: string; rate: number; seq: number }): WbsAssignee {
        return new WbsAssignee(args);
    }

    public static createFromDb(args: { id: number; wbsId: number; userId: string; userName?: string; rate: number; seq: number }): WbsAssignee {
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

    /**
     * 未割当担当者を作成（ビジネスルール）
     * 担当者が割り当てられていないタスクの按分時に使用
     */
    public static createUnassigned(wbsId: number): WbsAssignee {
        return new WbsAssignee({
            wbsId,
            userId: 'unassigned',
            rate: 1,
            seq: 0
        });
    }
}