import { ManHour } from "./man-hour";
import { PeriodType } from "./value-object/period-type";

export class Period {
    public readonly id?: number;
    public startDate: Date;
    public endDate: Date;
    public type: PeriodType;
    public manHours: ManHour[];

    private constructor(args: { id?: number; startDate: Date; endDate: Date; type: PeriodType; manHours: ManHour[] }) {
        this.id = args.id;
        this.startDate = args.startDate;
        this.endDate = args.endDate;
        this.type = args.type;
        this.manHours = args.manHours;

        this.validate();
    }

    public static create(args: { startDate: Date; endDate: Date; type: PeriodType; manHours: ManHour[] }): Period {
        return new Period(args);
    }

    public static createFromDb(args: {
        id: number;
        startDate: Date;
        endDate: Date;
        type: PeriodType;
        manHours: ManHour[];
    }): Period {
        return new Period({
            id: args.id,
            startDate: args.startDate,
            endDate: args.endDate,
            type: args.type,
            manHours: args.manHours,
        });
    }

    public isEqual(period: Period) {
        return this.id === period.id;
    }

    private validate() {
        if (this.startDate > this.endDate) {
            throw new Error('期間が不正です');
        }
    }
}