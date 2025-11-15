export class User {
    public readonly id?: string;
    public name: string;
    public displayName: string;
    public email: string;
    public costPerHour: number; // 時間単位の人員原価（円/時間）
    public readonly password?: string;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
    // public role: string;

    private constructor(
        args: {
            id?: string;
            name: string;
            displayName: string;
            email: string;
            costPerHour: number;
            password?: string;
            createdAt?: Date;
            updatedAt?: Date;
        }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
        this.email = args.email;
        this.costPerHour = args.costPerHour;
        this.password = args.password;
        this.createdAt = args.createdAt;
        this.updatedAt = args.updatedAt;

        // バリデーション
        if (this.costPerHour < 0) {
            throw new Error('costPerHour must be non-negative');
        }
    }

    public isEqual(user: User) {
        if (this.id === undefined || user.id === undefined) {
            return false;
        }
        return this.id === user.id;
    }

    public static create(args: { name: string; displayName: string; email: string; costPerHour: number }): User {
        return new User(args);
    }

    public static createFromDb(args: { id: string; name: string; displayName: string; email: string; costPerHour: number; password?: string; createdAt?: Date; updatedAt?: Date }): User {
        return new User(args);
    }

    isEmailValid(): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(this.email);
    }

    hasPassword(): boolean {
        // パスワードが設定されている場合は true
        return this.password ? true : false;
    }

}
