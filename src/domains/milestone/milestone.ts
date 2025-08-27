export class Milestone {
    public readonly id: number;
    public readonly name: string;
    public readonly date: Date;

    constructor(args: {
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

    public static rebuild(args: {
        id: number;
        name: string;
        date: Date;
    }): Milestone {
        return new Milestone(args);
    }
}