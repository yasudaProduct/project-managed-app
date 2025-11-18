import { PhaseCode } from "./phase-code";

export class Phase {
    public readonly id?: number;
    public name: string;
    public code: PhaseCode;
    public seq: number;
    public period?: { start: Date; end: Date }; // TODO: フェーズの期間は使用されていなので削除検討

    private constructor(args: { id?: number; name: string; code: PhaseCode; seq: number, period?: { start: Date; end: Date } }) {
        this.id = args.id;
        this.name = args.name;
        this.code = args.code;
        this.seq = args.seq;
        this.period = args.period;

        this.validate()
    }

    public static create(args: { name: string; code: PhaseCode; seq: number, period?: { start: Date; end: Date } }): Phase {
        return new Phase(args);
    }

    public static createFromDb(args: { id: number; name: string; code: PhaseCode; seq: number, period?: { start: Date; end: Date } }): Phase {
        return new Phase(args);
    }

    private validate() {
        // periodの開始日と終了日のバリデーション
        if (this.period) {
            if (this.period.start >= this.period.end) {
                throw new Error("無効な期間: 開始日は終了日より前である必要があります。");
            }
        }
    }
}