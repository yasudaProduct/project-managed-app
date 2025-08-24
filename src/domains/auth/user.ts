export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly name: string,
        public readonly displayName: string,
        public readonly password?: string,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) { }

    static create(
        id: string,
        email: string,
        name: string,
        displayName: string,
        password?: string
    ): User {
        return new User(
            id,
            email,
            name,
            displayName,
            password,
            new Date(),
            new Date()
        );
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