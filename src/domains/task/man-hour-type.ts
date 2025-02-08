import { KosuType as KosuTypeType } from "@/types/wbs";

export class ManHourType {
    public readonly type: KosuTypeType;

    constructor(args: { type: KosuTypeType }) {
        this.type = args.type;
    }
}