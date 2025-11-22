import { ManHourType } from "./value-object/man-hour-type";

export class ManHour {
    public readonly id?: number;
    public kosu: number;
    public type: ManHourType;

    private constructor(args: { id?: number; kosu: number; type: ManHourType }) {
        this.id = args.id;
        this.kosu = args.kosu;
        this.type = args.type;

        this.validate();
    }

    public static create(args: { kosu: number; type: ManHourType }): ManHour {
        return new ManHour(args);
    }

    public static createFromDb(args: { id: number; kosu: number; type: ManHourType }): ManHour {
        return new ManHour(args);
    }

    private validate() {
        if (this.kosu < 0) {
            throw new Error('工数は0以上である必要があります');
        }
    }
}