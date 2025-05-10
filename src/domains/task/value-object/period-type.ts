import { PeriodType as PeriodTypeType } from "@/types/wbs";

export class PeriodType {
    public readonly type: PeriodTypeType;

    constructor(args: { type: PeriodTypeType }) {
        this.type = args.type;
    }
}