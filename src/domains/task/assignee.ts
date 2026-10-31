// TODO: リファクタリングの余地あり このクラスいる？
export class Assignee {
    public readonly id?: number;
    public name: string;
    public displayName: string;
    /** 担当者のユーザーID（Users.id）。id は WBS 担当者（WbsAssignee）のIDで別物 */
    public readonly userId?: string;

    private constructor(args: { id?: number; name: string; displayName: string; userId?: string }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
        this.userId = args.userId;
    }

    public static create(args: { name: string; displayName: string }): Assignee {
        return new Assignee(args);
    }

    public static createFromDb(args: { id: number; name: string; displayName: string; userId?: string }): Assignee {
        return new Assignee(args);
    }
}