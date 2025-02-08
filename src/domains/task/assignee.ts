export class Assignee {
    public readonly id?: string;
    public name: string;
    public displayName: string;

    private constructor(args: { id?: string; name: string; displayName: string }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
    }

    public static create(args: { name: string; displayName: string }): Assignee {
        return new Assignee(args);
    }

    public static createFromDb(args: { id: string; name: string; displayName: string }): Assignee {
        return new Assignee(args);
    }

    public isEqual(assignee: Assignee) {
        return this.id === assignee.id;
    }
}