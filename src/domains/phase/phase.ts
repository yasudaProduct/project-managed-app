export class Phase {
    public readonly id?: number;
    public name: string;
    public seq: number;

    private constructor(args: { id?: number; name: string; seq: number }) {
        this.id = args.id;
        this.name = args.name;
        this.seq = args.seq;
    }

    public static create(args: { name: string; seq: number }): Phase {
        return new Phase(args);
    }

    public static createFromDb(args: { id: number; name: string; seq: number }): Phase {
        return new Phase(args);
    }

    public isEqual(phase: Phase) {
        return this.id === phase.id;
    }
}