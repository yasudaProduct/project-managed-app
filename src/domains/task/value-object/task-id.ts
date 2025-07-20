export class TaskNo {
    private constructor(private readonly value: string) {
        this.validateFormat(value);
    }

    private validateFormat(value: string): void {
        const pattern = /^[A-Z]\d+-\d{4}$/;
        if (!pattern.test(value)) {
            throw new Error('タスクIDのフォーマットが不正です。[工程コード]-[4桁の数字]の形式である必要があります。');
        }
    }

    public static create(phaseCode: string, sequenceNumber: number): TaskNo {
        const formattedNumber = String(sequenceNumber).padStart(4, '0');
        return new TaskNo(`${phaseCode}-${formattedNumber}`);
    }

    public static reconstruct(value: string): TaskNo {
        return new TaskNo(value);
    }

    public getValue(): string {
        return this.value;
    }
}