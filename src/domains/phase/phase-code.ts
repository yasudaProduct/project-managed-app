export class PhaseCode {
    private readonly code: string;

    constructor(code: string) {
        this.code = code;
    }

    public value(): string {
        return this.code;
    }
}