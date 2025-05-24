export class WbsAssignee {
    public readonly id?: number;
    public readonly userId: string;
    private rate: number;
    public readonly userName?: string;

    private constructor(args: { id?: number; userId: string; userName?: string; rate: number }) {
        this.id = args.id;
        this.userId = args.userId;
        this.userName = args.userName;
        this.rate = args.rate;
    }

    public static create(args: { userId: string; rate: number }): WbsAssignee {
        return new WbsAssignee(args);
    }

    public static createFromDb(args: { id: number; userId: string; userName?: string; rate: number }): WbsAssignee {
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
}