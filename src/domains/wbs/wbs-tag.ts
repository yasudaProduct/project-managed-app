export class WbsTag {
    public readonly id?: number;
    public readonly wbsId: number;
    public name: string;

    private constructor(args: { id?: number; wbsId: number; name: string }) {
        this.id = args.id;
        this.wbsId = args.wbsId;
        this.name = args.name;

        this.validate();
    }

    public static create(args: { wbsId: number; name: string }): WbsTag {
        return new WbsTag(args);
    }

    public static createFromDb(args: { id: number; wbsId: number; name: string }): WbsTag {
        return new WbsTag(args);
    }

    public isEqual(other: WbsTag): boolean {
        return this.wbsId === other.wbsId && this.name === other.name;
    }

    private validate() {
        if (!this.name || this.name.trim().length === 0) {
            throw new Error('タグ名は必須です');
        }
    }
}
