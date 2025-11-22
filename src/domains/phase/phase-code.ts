export class PhaseCode {
    private readonly code: string;

    constructor(code: string) {
        this.code = code;
        this.validate();
    }

    public value(): string {
        return this.code;
    }

    private validate() {
        const pattern = /^[a-zA-Z0-9]+$/;
        if (!pattern.test(this.code)) {
            throw new Error('コードは英数字である必要があります。');
        }
    }
}