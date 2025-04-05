export class TaskId {
    private constructor(private readonly value: string) {
        this.validateFormat(value);
    }

    private validateFormat(value: string): void {
        const pattern = /^[A-Z]\d+-\d{4}$/;
        console.log("validateFormat", value, pattern.test(value))
        if (!pattern.test(value)) {
            throw new Error('タスクIDのフォーマットが不正です。[工程コード]-[4桁の数字]の形式である必要があります。');
        }
    }

    public static create(phaseCode: string, sequenceNumber: number): TaskId {
        console.log("create", phaseCode, sequenceNumber)
        const formattedNumber = String(sequenceNumber).padStart(4, '0');
        console.log("formattedNumber", formattedNumber)
        return new TaskId(`${phaseCode}-${formattedNumber}`);
    }

    public static reconstruct(value: string): TaskId {
        return new TaskId(value);
    }

    public getValue(): string {
        return this.value;
    }
}