export class UserSession {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly token: string,
        public readonly expiresAt: Date,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) {}

    static create(userId: string, token: string, expiresAt: Date): UserSession {
        return new UserSession(
            crypto.randomUUID(),
            userId,
            token,
            expiresAt,
            new Date(),
            new Date()
        );
    }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isValid(): boolean {
        return !this.isExpired();
    }

    static generateToken(): string {
        return crypto.randomUUID() + '-' + Date.now().toString(36);
    }

    static createExpirationDate(daysFromNow: number = 30): Date {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysFromNow);
        return expirationDate;
    }
}