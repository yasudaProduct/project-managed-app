export class User {
    public readonly id?: string;
    public name: string;
    public displayName: string;
    public email: string;
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
            password?: string;
            createdAt?: Date;
            updatedAt?: Date;
        }) {
        this.id = args.id;
        this.name = args.name;
        this.displayName = args.displayName;
        this.email = args.email;
        this.password = args.password;
        this.createdAt = args.createdAt;
        this.updatedAt = args.updatedAt;
    }

    public isEqual(user: User) {
        if (this.id === undefined || user.id === undefined) {
            return false;
        }
        return this.id === user.id;
    }

    public static create(args: { name: string; displayName: string; email: string }): User {
        return new User(args);
    }

    public static createFromDb(args: { id: string; name: string; displayName: string; email: string }): User {
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
