export class Wbs {
    public readonly id?: number;
    public readonly projectId: string;
    public name: string;

    private constructor(args: { id: number; name: string; projectId: string }) {
        this.id = args.id;
        this.name = args.name;
        this.projectId = args.projectId;
    }

    public static create(args: { id: number; name: string; projectId: string }): Wbs {
        return new Wbs(args);
    }

    public static createFromDb(args: { id: number; name: string; projectId: string }): Wbs {
        return new Wbs(args);
    }

    public isEqual(wbs: Wbs) {
        return this.id === wbs.id;
    }
}