export class Milestone {
    public readonly id: number;
    public readonly name: string;
    public readonly date: Date;

    private constructor(args: {
        id: number;
        name: string;
        date: Date;
    }) {
        this.id = args.id;
        this.name = args.name;
        this.date = args.date;
    }

    public static create(args: {
        id: number;
        name: string;
        date: Date;
    }): Milestone {
        return new Milestone(args);
    }

    public static createFromDb(args: {
        id: number;
        name: string;
        date: Date;
    }): Milestone {
        return new Milestone(args);
    }
}