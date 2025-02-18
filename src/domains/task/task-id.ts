export class TaskId {
    private readonly id: string;

    constructor(value: string) {
        if (!/^[A-Z0-9]+-\d{4}$/.test(value)) {
            console.log(value);
            throw new Error("タスクIDの形式が不正です。（例: ENG-0001）");
        }
        this.id = value;
    }

    public value(): string {
        return this.id;
    }
}