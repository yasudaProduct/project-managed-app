// TODO: リファクタリングの余地あり このクラスいる？
export class Assignee {
    public readonly id?: number;
    public name: string;
    public displayName: string;

    private constructor(args: { id?: number; name: string; displayName: string }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
    }

    public static create(args: { name: string; displayName: string }): Assignee {
        return new Assignee(args);
    }

    public static createFromDb(args: { id: number; name: string; displayName: string }): Assignee {
        return new Assignee(args);
    }
}